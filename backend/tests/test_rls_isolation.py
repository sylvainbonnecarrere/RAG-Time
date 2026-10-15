"""
Banc d'Essai TDD — US-BACK-02 : Isolation Row-Level Security (RLS) PostgreSQL & Pooling
Valide l'étanchéité SQL absolue entre tenants (TNR-02) et la politique tenant_isolation_policy.
"""

import uuid
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_tenant_session, set_tenant_context, reset_tenant_context


@pytest.mark.asyncio
async def test_rls_isolation_between_tenants():
    """
    Scénario TNR-02 :
    1. Crée deux tenants Alpha et Beta.
    2. Insère des documents/chunks pour Alpha et pour Beta.
    3. Exécute SELECT * FROM documents sous le contexte de Alpha.
       -> Doit voir UNIQUEMENT les documents de Alpha, 0 document de Beta.
    4. Exécute SELECT * FROM documents sous le contexte de Beta.
       -> Doit voir UNIQUEMENT les documents de Beta, 0 document de Alpha.
    """
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    tenant_alpha_id = uuid.uuid4()
    tenant_beta_id = uuid.uuid4()

    async with async_session() as session:
        # Nettoyage et insertion des deux tenants (la table tenants n'a pas de RLS)
        await session.execute(
            text("""
            INSERT INTO tenants (id, name, slug, category, system_prompt)
            VALUES 
                (:id_a, 'Tenant Alpha RLS', :slug_a, 'tech', 'Prompt Alpha'),
                (:id_b, 'Tenant Beta RLS', :slug_b, 'sante', 'Prompt Beta')
            ON CONFLICT (id) DO NOTHING;
            """),
            {
                "id_a": str(tenant_alpha_id),
                "slug_a": f"tenant-alpha-{uuid.uuid4().hex[:6]}",
                "id_b": str(tenant_beta_id),
                "slug_b": f"tenant-beta-{uuid.uuid4().hex[:6]}",
            }
        )
        await session.commit()

    # Insertion sécurisée du document Alpha sous le contexte tenant Alpha
    doc_alpha_id = uuid.uuid4()
    async with get_tenant_session(tenant_alpha_id) as session_alpha:
        await session_alpha.execute(
            text("""
            INSERT INTO documents (id, tenant_id, name, file_type, extraction_method)
            VALUES (:id, :tenant_id, 'Doc Alpha Secret.pdf', 'pdf', 'native_pdf');
            """),
            {"id": str(doc_alpha_id), "tenant_id": str(tenant_alpha_id)}
        )

    # Insertion sécurisée du document Beta sous le contexte tenant Beta
    doc_beta_id = uuid.uuid4()
    async with get_tenant_session(tenant_beta_id) as session_beta:
        await session_beta.execute(
            text("""
            INSERT INTO documents (id, tenant_id, name, file_type, extraction_method)
            VALUES (:id, :tenant_id, 'Doc Beta Secret.pdf', 'pdf', 'native_pdf');
            """),
            {"id": str(doc_beta_id), "tenant_id": str(tenant_beta_id)}
        )

    # 1. Test sous le contexte de Tenant Alpha
    async with get_tenant_session(tenant_alpha_id) as session:
        result = await session.execute(text("SELECT id, name, tenant_id FROM documents;"))
        rows = result.fetchall()
        # Doit voir son propre document
        assert any(row[0] == doc_alpha_id for row in rows)
        # Ne doit JAMAIS voir le document de Tenant Beta
        assert not any(row[0] == doc_beta_id for row in rows)

    # 2. Test sous le contexte de Tenant Beta
    async with get_tenant_session(tenant_beta_id) as session:
        result = await session.execute(text("SELECT id, name, tenant_id FROM documents;"))
        rows = result.fetchall()
        # Doit voir son propre document
        assert any(row[0] == doc_beta_id for row in rows)
        # Ne doit JAMAIS voir le document de Tenant Alpha
        assert not any(row[0] == doc_alpha_id for row in rows)

    await engine.dispose()
