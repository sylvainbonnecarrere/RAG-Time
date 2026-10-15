"""
Banc d'Essai Sécurité SecOps — US-SEC-01 : Modélisation des Menaces STRIDE & Isolation RLS PostgreSQL
Valide l'herméticité absolue des politiques RLS face aux tentatives de Spoofing, Tampering et Information Disclosure (TNR-02).
"""

import uuid

import pytest
from app.core.config import settings
from app.core.database import get_tenant_session
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


@pytest.mark.asyncio
async def test_stride_cross_tenant_information_disclosure_via_joins():
    """
    Menace STRIDE : Information Disclosure (Fuite par jointures et sous-requêtes)
    Un utilisateur sous le contexte du Tenant A ne doit JAMAIS pouvoir extraire
    les documents ou chunks du Tenant B, même via jointures ou sous-requêtes globales.
    """
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    doc_a_id = uuid.uuid4()
    doc_b_id = uuid.uuid4()
    chunk_b_id = uuid.uuid4()

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Préparation des deux tenants
    async with async_session() as session:
        await session.execute(
            text("""
            INSERT INTO tenants (id, name, slug, category, system_prompt)
            VALUES 
                (:id_a, 'Tenant Alpha SecOps', :slug_a, 'defense', 'Prompt A'),
                (:id_b, 'Tenant Beta Confidentiel', :slug_b, 'sante', 'Prompt B')
            ON CONFLICT (id) DO NOTHING;
            """),
            {
                "id_a": str(tenant_a_id),
                "slug_a": f"secops-a-{uuid.uuid4().hex[:6]}",
                "id_b": str(tenant_b_id),
                "slug_b": f"secops-b-{uuid.uuid4().hex[:6]}",
            }
        )
        await session.commit()

    # 2. Insertion sous contexte Tenant A
    async with get_tenant_session(tenant_a_id) as sess_a:
        await sess_a.execute(
            text("INSERT INTO documents (id, tenant_id, name, file_type, extraction_method) VALUES (:id, :t_id, 'Doc_Alpha.pdf', 'pdf', 'native');"),
            {"id": str(doc_a_id), "t_id": str(tenant_a_id)}
        )

    # 3. Insertion sous contexte Tenant B (avec document, version et chunk confidentiel)
    async with get_tenant_session(tenant_b_id) as sess_b:
        ver_b_id = uuid.uuid4()
        await sess_b.execute(
            text("INSERT INTO documents (id, tenant_id, name, file_type, extraction_method) VALUES (:id, :t_id, 'Doc_Beta_TopSecret.pdf', 'pdf', 'native');"),
            {"id": str(doc_b_id), "t_id": str(tenant_b_id)}
        )
        await sess_b.execute(
            text("INSERT INTO document_versions (id, document_id, version_number, sha256_checksum, file_size_bytes, storage_path) VALUES (:id, :d_id, 1, :sha, 2048, '/storage/beta.pdf');"),
            {"id": str(ver_b_id), "d_id": str(doc_b_id), "sha": "e" * 64}
        )
        dummy_vec = "[" + ",".join(["0.02"] * 768) + "]"
        await sess_b.execute(
            text("INSERT INTO document_chunks (id, document_id, version_id, tenant_id, chunk_index, content, sha256_hash, token_count, embedding) VALUES (:id, :d_id, :v_id, :t_id, 0, 'Données médicales ultraconfidentielles Beta', :sha, 15, CAST(:vec AS vector));"),
            {"id": str(chunk_b_id), "d_id": str(doc_b_id), "v_id": str(ver_b_id), "t_id": str(tenant_b_id), "sha": "f" * 64, "vec": dummy_vec}
        )

    # 4. Tentative de fuite sous le contexte Tenant A
    async with get_tenant_session(tenant_a_id) as sess_a:
        # A. Requête directe : doit retourner 0 chunk
        res_direct = await sess_a.execute(text("SELECT id, content FROM document_chunks;"))
        assert len(res_direct.fetchall()) == 0

        # B. Tentative avec sous-requête transversale non filtrée
        res_subquery = await sess_a.execute(
            text("SELECT id, content FROM document_chunks WHERE tenant_id IN (SELECT id FROM tenants);")
        )
        assert len(res_subquery.fetchall()) == 0

        # C. Tentative avec jointure explicite vers documents
        res_join = await sess_a.execute(
            text("SELECT c.id, c.content FROM document_chunks c JOIN documents d ON c.document_id = d.id;")
        )
        assert len(res_join.fetchall()) == 0

    await engine.dispose()


@pytest.mark.asyncio
async def test_stride_cross_tenant_tampering_and_spoofing():
    """
    Menaces STRIDE : Spoofing & Tampering (Usurpation de tenant et falsification croisée)
    Un attaquant opérant sous le contexte de Tenant A ne doit pas pouvoir :
    1. Modifier un document appartenant à Tenant B.
    2. Supprimer un document appartenant à Tenant B.
    3. Insérer un document en prétendant qu'il appartient à Tenant B (Spoofing).
    """
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    doc_b_id = uuid.uuid4()

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        await session.execute(
            text("""
            INSERT INTO tenants (id, name, slug, category, system_prompt)
            VALUES 
                (:id_a, 'Tenant Alpha Attacker', :slug_a, 'tech', 'Prompt A'),
                (:id_b, 'Tenant Beta Target', :slug_b, 'finance', 'Prompt B')
            ON CONFLICT (id) DO NOTHING;
            """),
            {
                "id_a": str(tenant_a_id),
                "slug_a": f"attacker-{uuid.uuid4().hex[:6]}",
                "id_b": str(tenant_b_id),
                "slug_b": f"target-{uuid.uuid4().hex[:6]}",
            }
        )
        await session.commit()

    # Créer le document cible sous Tenant B
    async with get_tenant_session(tenant_b_id) as sess_b:
        await sess_b.execute(
            text("INSERT INTO documents (id, tenant_id, name, file_type, extraction_method) VALUES (:id, :t_id, 'Budget_Secret_Beta.pdf', 'pdf', 'native');"),
            {"id": str(doc_b_id), "t_id": str(tenant_b_id)}
        )

    # Attaque sous Tenant A :
    async with get_tenant_session(tenant_a_id) as sess_a:
        # 1. Tampering : UPDATE du document de B -> doit affecter 0 ligne (invisible via RLS)
        update_res = await sess_a.execute(
            text("UPDATE documents SET name = 'Document_Altéré.pdf' WHERE id = :id;"),
            {"id": str(doc_b_id)}
        )
        assert update_res.rowcount == 0

        # 2. Tampering : DELETE du document de B -> doit affecter 0 ligne
        del_res = await sess_a.execute(
            text("DELETE FROM documents WHERE id = :id;"),
            {"id": str(doc_b_id)}
        )
        assert del_res.rowcount == 0

        # 3. Spoofing : Tentative d'INSERT d'une ligne avec tenant_id = B -> DOIT LEVER UNE EXCEPTION RLS
        with pytest.raises(DBAPIError) as exc_info:
            await sess_a.execute(
                text("INSERT INTO documents (id, tenant_id, name, file_type, extraction_method) VALUES (:id, :t_id, 'Malicious_Doc.pdf', 'pdf', 'native');"),
                {"id": str(uuid.uuid4()), "t_id": str(tenant_b_id)}
            )
        assert "violates row-level security policy" in str(exc_info.value)

    # Vérification sous Tenant B : Le document initial est demeuré parfaitement intègre
    async with get_tenant_session(tenant_b_id) as sess_b:
        check_res = await sess_b.execute(text("SELECT name FROM documents WHERE id = :id;"), {"id": str(doc_b_id)})
        assert check_res.scalar() == "Budget_Secret_Beta.pdf"

    await engine.dispose()
