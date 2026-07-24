import jwt
import datetime

# By default, the API uses "jwt-secret-key" if JWT_SECRET is not in .env
JWT_SECRET = "jwt-secret-key"
JWT_ALGORITHM = "HS256"

payload = {
    "sub": "aifa", # The username
    "role": "admin", # The user's role
    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
}

token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
print(f"Your JWT Token:\n{token}")
