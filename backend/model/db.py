"""
Database access for the incident classifier (Neon / any PostgreSQL via SQLAlchemy).

Config comes from environment variables - never hard-code the connection string:

    DATABASE_URL        postgresql://user:pass@host/db?sslmode=require   (required)
    HISTORICAL_TABLE    default "historical data"  (matches historical_data / "historical data" etc.)
    INCIDENT_TABLE      default "incident"         (matches incidents / incident etc.)

Optional column overrides if auto-detection picks the wrong ones:
    DESC_COL, CATEGORY_COL, PRIORITY_COL, ID_COL

Check what your database looks like:
    python db.py
"""
import os
import re
from functools import lru_cache

import pandas as pd
from sqlalchemy import bindparam, create_engine, inspect, text

CANDIDATES = {
    "desc": ["description", "incident_description", "details", "narrative", "summary",
             "complaint", "complaint_text", "text", "report", "remarks"],
    "category": ["category", "incident_category", "incident_type", "type", "crime_type",
                 "crime_category", "classification"],
    "priority": ["priority", "priority_level", "severity", "urgency", "severity_level"],
    "id": ["incident_id", "id", "case_id", "complaint_id", "uuid"],
}
ENV_OVERRIDE = {"desc": "DESC_COL", "category": "CATEGORY_COL", "priority": "PRIORITY_COL", "id": "ID_COL"}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


@lru_cache(maxsize=1)
def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return create_engine(url, pool_pre_ping=True, pool_recycle=300)


def find_table(engine, wanted: str) -> str:
    """Match 'historical data' to historical_data / "historical data" / historicaldata, and
    'incident' to incident / incidents."""
    names = inspect(engine).get_table_names()
    target = _norm(wanted)
    for n in names:
        if _norm(n) == target:
            return n
    for n in names:                       # allow plural / singular
        if _norm(n) in (target + "s", target.rstrip("s")):
            return n
    raise LookupError(f"Table like '{wanted}' not found. Tables present: {names}")


def find_columns(engine, table: str) -> dict:
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    by_norm = {_norm(c): c for c in cols}
    found = {}
    for role, cands in CANDIDATES.items():
        env = os.environ.get(ENV_OVERRIDE[role])
        if env:
            if env not in cols:
                raise LookupError(f"{ENV_OVERRIDE[role]}={env} is not a column of {table}: {cols}")
            found[role] = env
            continue
        for cand in cands:
            if _norm(cand) in by_norm:
                found[role] = by_norm[_norm(cand)]
                break
    return found


def _q(engine, ident: str) -> str:
    return engine.dialect.identifier_preparer.quote(ident)


def load_historical(engine=None) -> pd.DataFrame:
    """Return DataFrame with columns: text, category, priority (labelled training data)."""
    engine = engine or get_engine()
    table = find_table(engine, os.environ.get("HISTORICAL_TABLE", "historical data"))
    cols = find_columns(engine, table)
    missing = [r for r in ("desc", "category", "priority") if r not in cols]
    if missing:
        raise LookupError(
            f"Could not find column(s) for {missing} in '{table}'. "
            f"Set DESC_COL / CATEGORY_COL / PRIORITY_COL. Columns: "
            f"{[c['name'] for c in inspect(engine).get_columns(table)]}")
    sql = (f"SELECT {_q(engine, cols['desc'])} AS text, {_q(engine, cols['category'])} AS category, "
           f"{_q(engine, cols['priority'])} AS priority FROM {_q(engine, table)}")
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn)


def load_incidents(engine=None, limit=100, ids=None, status=None) -> pd.DataFrame:
    """Return DataFrame with columns: incident_id, text (+ every original column as extra_*)."""
    engine = engine or get_engine()
    table = find_table(engine, os.environ.get("INCIDENT_TABLE", "incident"))
    cols = find_columns(engine, table)
    if "desc" not in cols:
        raise LookupError(f"No description-like column found in '{table}'. Set DESC_COL.")
    idc = cols.get("id")
    if ids is not None and len(ids) == 0:          # explicit empty id list -> nothing, not everything
        return pd.DataFrame({"incident_id": [], "text": []})
    select = f"SELECT * FROM {_q(engine, table)}"
    where, params = [], {}
    if ids and idc:
        where.append(f"{_q(engine, idc)} IN :ids")
        params["ids"] = tuple(ids)
    if status:
        scol = next((c["name"] for c in inspect(engine).get_columns(table) if _norm(c["name"]) == "status"), None)
        if scol:
            where.append(f"{_q(engine, scol)} = :status")
            params["status"] = status
    if where:
        select += " WHERE " + " AND ".join(where)
    if idc:
        select += f" ORDER BY {_q(engine, idc)} DESC"
    select += " LIMIT :lim"
    params["lim"] = int(limit)
    stmt = text(select)
    if "ids" in params:
        stmt = stmt.bindparams(bindparam("ids", expanding=True))
    with engine.connect() as conn:
        df = pd.read_sql(stmt, conn, params=params)
    out = pd.DataFrame({"incident_id": df[idc] if idc else range(len(df)), "text": df[cols["desc"]]})
    return out


if __name__ == "__main__":
    eng = get_engine()
    for t in inspect(eng).get_table_names():
        with eng.connect() as c:
            n = c.execute(text(f"SELECT COUNT(*) FROM {_q(eng, t)}")).scalar()
        print(f"\n{t}  ({n} rows)")
        for col in inspect(eng).get_columns(t):
            print(f"   - {col['name']}: {col['type']}")
    for label, env, dflt in (("historical", "HISTORICAL_TABLE", "historical data"),
                             ("incident", "INCIDENT_TABLE", "incident")):
        try:
            t = find_table(eng, os.environ.get(env, dflt))
            print(f"\n[{label}] table -> {t!r}; detected columns -> {find_columns(eng, t)}")
        except Exception as e:
            print(f"\n[{label}] {e}")
