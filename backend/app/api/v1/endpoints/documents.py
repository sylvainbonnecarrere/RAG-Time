"""
RAGTIME Backend API — Endpoints de Cycle Documentaire & Ingestion Asynchrone
Gère l'upload multipart sécurisé (US-BACK-04), l'ingestion web Trafilatura avec anti-SSRF (US-BACK-05),
l'immuabilité des versions (TNR-03) et le partitionnement via ARQ.
"""

import hashlib
import os
import uuid
from datetime import UTC, datetime

from app.core.anti_ssrf import assert_url_safe
from app.core.database import get_tenant_session
from app.core.worker import IngestionQueueService
from app.infrastructure.rag.dry_run_simulator import DryRunSimulatorAdapter
from app.models.documents import (
    Document,
    DocumentRead,
    DocumentScrapeRequest,
    DocumentUploadResponse,
    DocumentVersion,
    DocumentVersionRead,
    DryRunChunkPreviewDTO,
    DryRunSimulationRequest,
    DryRunSimulationResponse,
    IngestionJobRead,
    SemanticAuditDTO,
    TokenHistogramDTO,
)
from app.models.presets import RagPreset
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select

router = APIRouter(prefix="/tenants/{tenant_id}/documents", tags=["Documents & Ingestion"])

# Extensions et formats autorisés
ALLOWED_EXTENSIONS = {".pdf", ".md", ".markdown", ".txt", ".sql"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/sql",
    "text/sql",
    "application/octet-stream",  # Souvent envoyé par certains navigateurs pour .md ou .sql
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 Mo


@router.get("", response_model=list[DocumentRead])
async def list_documents_for_tenant(tenant_id: uuid.UUID):
    """
    Retourne la liste des documents du tenant avec leurs versions associées.
    Opère sous isolation stricte RLS.
    """
    async with get_tenant_session(tenant_id) as session:
        stmt_docs = (
            select(Document)
            .where(Document.tenant_id == tenant_id)
            .order_by(Document.created_at.desc())
        )
        res_docs = await session.execute(stmt_docs)
        docs = res_docs.scalars().all()

        result = []
        for doc in docs:
            stmt_versions = (
                select(DocumentVersion)
                .where(DocumentVersion.document_id == doc.id)
                .order_by(DocumentVersion.version_number.asc())
            )
            res_versions = await session.execute(stmt_versions)
            versions = res_versions.scalars().all()

            doc_read = DocumentRead(
                id=doc.id,
                tenant_id=doc.tenant_id,
                name=doc.name,
                file_type=doc.file_type,
                source_url=doc.source_url,
                extraction_method=doc.extraction_method,
                description=doc.description,
                current_version=doc.current_version,
                total_chunks=doc.total_chunks,
                cleaning_stats=doc.cleaning_stats,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                versions=[
                    DocumentVersionRead(
                        id=v.id,
                        document_id=v.document_id,
                        version_number=v.version_number,
                        sha256_checksum=v.sha256_checksum,
                        file_size_bytes=v.file_size_bytes,
                        chunks_count=v.chunks_count,
                        status=v.status,
                        storage_path=v.storage_path,
                        created_at=v.created_at,
                    )
                    for v in versions
                ],
            )
            result.append(doc_read)

        return result


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    tenant_id: uuid.UUID,
    file: UploadFile = File(...),  # noqa: B008
    sha256: str | None = Form(None),
    description: str | None = Form(None),
):
    """
    Téléversement multipart d'un document (US-BACK-04).
    - Validation de la taille et de l'extension
    - Calcul et certification du checksum SHA-256
    - Création du document ou création d'une version incrémentale v+1 (TNR-03)
    - Enrôlement asynchrone dans Redis / ARQ
    """
    filename = file.filename or "sans_nom.txt"
    _, ext = os.path.splitext(filename.lower())

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format '{ext}' non supporté. Formats autorisés : PDF, Markdown (.md), TXT, SQL.",
        )

    # Lecture du contenu brut
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fichier trop volumineux. La limite maximale est de 20 Mo.",
        )

    # Calcul SHA-256 serveur
    server_sha256 = hashlib.sha256(file_bytes).hexdigest()

    # Vérification d'intégrité si le client a fourni son hash
    if sha256 and sha256.lower() != server_sha256:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Échec de vérification d'intégrité : le checksum SHA-256 ne correspond pas au contenu reçu.",
        )

    # Détermination du file_type normalisé
    type_mapping = {
        ".pdf": "pdf",
        ".md": "markdown",
        ".markdown": "markdown",
        ".txt": "txt",
        ".sql": "sql",
    }
    file_type = type_mapping.get(ext, "txt")

    # Décodage textuel (si textuel)
    try:
        raw_text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raw_text = file_bytes.decode("latin-1", errors="replace")

    async with get_tenant_session(tenant_id) as session:
        # Vérifier si un document du même nom existe déjà pour ce tenant (TNR-03 Versionnage)
        stmt_existing = (
            select(Document)
            .where(Document.tenant_id == tenant_id, Document.name == filename)
            .limit(1)
        )
        res_existing = await session.execute(stmt_existing)
        existing_doc = res_existing.scalars().first()

        now = datetime.now(UTC)

        if existing_doc:
            # Incrémentation de version (TNR-03)
            doc = existing_doc
            new_version_num = doc.current_version + 1
            doc.current_version = new_version_num
            doc.updated_at = now
            if description:
                doc.description = description
            session.add(doc)
            await session.flush()
        else:
            # Nouveau document
            new_version_num = 1
            doc = Document(
                tenant_id=tenant_id,
                name=filename,
                file_type=file_type,
                extraction_method="native_parser",
                description=description,
                current_version=1,
                total_chunks=0,
                cleaning_stats={},
                created_at=now,
                updated_at=now,
            )
            session.add(doc)
            await session.flush()

        # Création de la version de document
        doc_version = DocumentVersion(
            document_id=doc.id,
            version_number=new_version_num,
            sha256_checksum=server_sha256,
            file_size_bytes=len(file_bytes),
            chunks_count=0,
            status="pending",
            storage_path=f"/secure_vault/{tenant_id}/{doc.id}/v{new_version_num}_{filename}",
            created_at=now,
        )
        session.add(doc_version)
        await session.flush()

        version_id = doc_version.id

    # Enrôlement asynchrone dans Redis / ARQ
    job_id = await IngestionQueueService.enqueue_ingestion(
        document_id=doc.id,
        version_id=version_id,
        tenant_id=tenant_id,
        raw_content=raw_text,
        is_web_scrape=False,
    )

    doc_read = DocumentRead(
        id=doc.id,
        tenant_id=doc.tenant_id,
        name=doc.name,
        file_type=doc.file_type,
        source_url=doc.source_url,
        extraction_method=doc.extraction_method,
        description=doc.description,
        current_version=doc.current_version,
        total_chunks=doc.total_chunks,
        cleaning_stats=doc.cleaning_stats,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        versions=[
            DocumentVersionRead(
                id=doc_version.id,
                document_id=doc.id,
                version_number=doc_version.version_number,
                sha256_checksum=doc_version.sha256_checksum,
                file_size_bytes=doc_version.file_size_bytes,
                chunks_count=0,
                status="pending",
                storage_path=doc_version.storage_path,
                created_at=doc_version.created_at,
            )
        ],
    )

    job_read = IngestionJobRead(
        job_id=job_id,
        tenant_id=tenant_id,
        document_id=doc.id,
        document_name=doc.name,
        version=new_version_num,
        status="pending",
        progress_pct=0,
        step_description="Enregistré en file d'ingestion asynchrone ARQ",
        sha256=server_sha256,
        created_at=now,
    )

    return DocumentUploadResponse(document=doc_read, job=job_read)


@router.post("/scrape", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def scrape_web_document(
    tenant_id: uuid.UUID,
    request: DocumentScrapeRequest,
):
    """
    Ingestion web asynchrone via Trafilatura 2.0 (US-BACK-05).
    - Validation anti-SSRF bloquante immédiate (rejet 127.0.0.1, RFC 1918, 169.254.169.254)
    - Création du document html_url en statut pending
    - Enrôlement dans la queue ARQ pour extraction, nettoyage et chunking
    """
    url_str = str(request.url)

    # 1. Validation Anti-SSRF stricte (Bloquante dès l'entrée d'API)
    try:
        assert_url_safe(url_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL non sécurisée ou interdite (Anti-SSRF) : {exc}",
        )

    # Nom d'origine dérivé de l'URL
    url_path = url_str.split("?")[0].rstrip("/")
    doc_name = url_path.split("/")[-1] or "web_article"
    if not doc_name.endswith((".html", ".htm")):
        doc_name = f"{doc_name}.html"

    now = datetime.now(UTC)

    async with get_tenant_session(tenant_id) as session:
        # Création du document
        doc = Document(
            tenant_id=tenant_id,
            name=doc_name,
            file_type="html_url",
            source_url=url_str,
            extraction_method="trafilatura_2.0",
            description=request.description or f"Article extrait depuis {url_str}",
            current_version=1,
            total_chunks=0,
            cleaning_stats={},
            created_at=now,
            updated_at=now,
        )
        session.add(doc)
        await session.flush()

        temp_hash = hashlib.sha256(url_str.encode("utf-8")).hexdigest()

        doc_version = DocumentVersion(
            document_id=doc.id,
            version_number=1,
            sha256_checksum=temp_hash,
            file_size_bytes=0,
            chunks_count=0,
            status="pending",
            storage_path=url_str,
            created_at=now,
        )
        session.add(doc_version)
        await session.flush()

        version_id = doc_version.id

    # Enrôlement asynchrone ARQ pour le crawl, nettoyage et chunking
    job_id = await IngestionQueueService.enqueue_ingestion(
        document_id=doc.id,
        version_id=version_id,
        tenant_id=tenant_id,
        is_web_scrape=True,
        source_url=url_str,
    )

    doc_read = DocumentRead(
        id=doc.id,
        tenant_id=doc.tenant_id,
        name=doc.name,
        file_type=doc.file_type,
        source_url=doc.source_url,
        extraction_method=doc.extraction_method,
        description=doc.description,
        current_version=doc.current_version,
        total_chunks=doc.total_chunks,
        cleaning_stats=doc.cleaning_stats,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        versions=[
            DocumentVersionRead(
                id=doc_version.id,
                document_id=doc.id,
                version_number=doc_version.version_number,
                sha256_checksum=doc_version.sha256_checksum,
                file_size_bytes=doc_version.file_size_bytes,
                chunks_count=0,
                status="pending",
                storage_path=doc_version.storage_path,
                created_at=doc_version.created_at,
            )
        ],
    )

    job_read = IngestionJobRead(
        job_id=job_id,
        tenant_id=tenant_id,
        document_id=doc.id,
        document_name=doc.name,
        version=1,
        status="pending",
        progress_pct=0,
        step_description="Crawl Web & Ingestion programmée dans ARQ",
        sha256=temp_hash,
        created_at=now,
    )

    return DocumentUploadResponse(document=doc_read, job=job_read)


@router.post("/dry-run", response_model=DryRunSimulationResponse, status_code=status.HTTP_200_OK)
async def simulate_pre_indexing_dry_run(
    tenant_id: uuid.UUID,
    request: DryRunSimulationRequest,
):
    """
    Simulateur Dry-Run Pré-Indexation 100% en Mémoire (US-BACK-07, US-IA-08 & TNR-29).
    - Exécute le pipeline en mémoire sans AUCUN appel SQL INSERT.
    - Calcule l'histogramme de tokens (min, max, moyenne, médiane, tranches) et le budget VRAM pgvector HNSW.
    - Évalue l'audit d'équilibre sémantique (perte d'ancrage < 60 tokens, dilution > 800 tokens).
    - Restitue les 3 premiers fragments découpés.
    - Valide l'invariant strict TNR-28 : chunk_overlap < chunk_size / 2.
    """
    simulator = DryRunSimulatorAdapter()

    # 1. Récupération du preset actif si paramètres non spécifiés
    async with get_tenant_session(tenant_id) as session:
        stmt_preset = (
            select(RagPreset)
            .where(RagPreset.tenant_id == tenant_id, RagPreset.is_active == True)
            .limit(1)
        )
        res_preset = await session.execute(stmt_preset)
        preset = res_preset.scalars().first()

    strategy = request.strategy or (preset.chunking_strategy if preset else "fixed_sliding")
    chunk_size = request.chunk_size if request.chunk_size is not None else (preset.chunk_size if preset else 512)
    chunk_overlap = request.chunk_overlap if request.chunk_overlap is not None else (preset.chunk_overlap if preset else 64)
    prefix_titles = request.prefix_section_title if request.prefix_section_title is not None else (preset.prefix_section_title if preset else True)
    embedding_dim = preset.embedding_dim if preset else 768

    # 2. Validation de l'invariant TNR-28
    if chunk_overlap >= (chunk_size / 2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"TNR-28 Invariant Violé: chunk_overlap ({chunk_overlap}) doit être strictement inférieur à chunk_size / 2 ({chunk_size / 2})",
        )

    # 3. Exécution in-memory via le simulateur RAG souverain
    try:
        analysis = simulator.simulate(
            text=request.text,
            strategy=strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            prefix_section_title=prefix_titles,
            embedding_dim=embedding_dim,
            preview_limit=3,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    previews = [
        DryRunChunkPreviewDTO(
            chunk_index=c.chunk_index,
            token_count=c.token_count,
            char_count=len(c.content),
            context_prefix=c.context_prefix,
            excerpt=c.content[:200] + ("..." if len(c.content) > 200 else ""),
        )
        for c in analysis.preview_chunks
    ]

    hist_dto = TokenHistogramDTO(
        median_tokens=analysis.histogram.median_tokens,
        percentile_25=analysis.histogram.percentile_25,
        percentile_75=analysis.histogram.percentile_75,
        bucket_less_than_60=analysis.histogram.bucket_less_than_60,
        bucket_60_to_150=analysis.histogram.bucket_60_to_150,
        bucket_151_to_300=analysis.histogram.bucket_151_to_300,
        bucket_301_to_500=analysis.histogram.bucket_301_to_500,
        bucket_501_to_800=analysis.histogram.bucket_501_to_800,
        bucket_more_than_800=analysis.histogram.bucket_more_than_800,
    )

    audit_dto = SemanticAuditDTO(
        under_chunked_count=analysis.semantic_audit.under_chunked_count,
        over_chunked_count=analysis.semantic_audit.over_chunked_count,
        is_balanced=analysis.semantic_audit.is_balanced,
        diagnostic=analysis.semantic_audit.diagnostic,
    )

    return DryRunSimulationResponse(
        total_chunks=analysis.total_chunks,
        total_tokens=analysis.histogram.total_tokens,
        avg_tokens_per_chunk=analysis.histogram.avg_tokens,
        min_tokens=analysis.histogram.min_tokens,
        max_tokens=analysis.histogram.max_tokens,
        raw_vector_bytes=analysis.vram.raw_vector_bytes,
        hnsw_overhead_bytes=analysis.vram.hnsw_overhead_bytes,
        total_vram_bytes=analysis.vram.total_vram_bytes,
        preview_chunks=previews,
        histogram=hist_dto,
        semantic_audit=audit_dto,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    tenant_id: uuid.UUID,
    document_id: uuid.UUID,
):
    """
    Suppression d'un document et de ses versions/chunks en cascade.
    Protégé sous session RLS.
    """
    async with get_tenant_session(tenant_id) as session:
        # Vérification d'existence
        stmt = (
            select(Document)
            .where(Document.id == document_id, Document.tenant_id == tenant_id)
            .limit(1)
        )
        res = await session.execute(stmt)
        doc = res.scalars().first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document introuvable sur cet espace de travail.",
            )

        # Suppression des versions
        await session.execute(
            delete(DocumentVersion).where(DocumentVersion.document_id == document_id)
        )
        # Suppression du document
        await session.delete(doc)

