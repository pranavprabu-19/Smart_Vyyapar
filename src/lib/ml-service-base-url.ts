/**
 * Canonical FastAPI ML service base URL for this app.
 * Use one running backend (e.g. uvicorn on port 8000); set in `.env.local` for each environment.
 *
 * Resolution: `ML_SERVICE_URL` (preferred) → `ML_API_URL` (legacy alias) → local default.
 */
export function getMlServiceBaseUrl(): string {
    const fromService = process.env.ML_SERVICE_URL?.trim();
    const fromApi = process.env.ML_API_URL?.trim();
    return fromService || fromApi || "http://127.0.0.1:8000";
}
