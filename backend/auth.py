"""
auth.py: login del administrador con JWT.

Cómo funciona:
  1. El admin envía usuario y contraseña a POST /api/auth/login.
  2. Si coinciden con ADMIN_USER / ADMIN_PASSWORD del .env, el servidor devuelve un token JWT firmado.
  3. El frontend guarda el token y lo manda en cada petición: header  Authorization: Bearer <token>.
  4. `require_admin` verifica la firma y la caducidad del token antes de dejar pasar a las rutas /api/admin.

Para un proyecto demostrativo hay UN solo administrador definido en el .env (sin tabla de usuarios).
"""
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not JWT_SECRET or not ADMIN_PASSWORD:
    raise RuntimeError("Faltan JWT_SECRET y ADMIN_PASSWORD en el .env (mira .env.example).")

ALGORITHM = "HS256"
TOKEN_HOURS = 8

bearer = HTTPBearer(auto_error=False)  # auto_error=False para devolver nuestro propio mensaje 401


def check_credentials(username: str, password: str) -> bool:
    # compare_digest compara en tiempo constante (evita ataques de temporización)
    ok_user = hmac.compare_digest(username.encode(), ADMIN_USER.encode())
    ok_pass = hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode())
    return ok_user and ok_pass


def create_token(username: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": username, "exp": expires}, JWT_SECRET, algorithm=ALGORITHM)


def require_admin(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """Dependencia de FastAPI: si el token falta o no es válido, responde 401."""
    unauthorized = HTTPException(status_code=401, detail="Sesión no válida o caducada", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise unauthorized
    return payload["sub"]
