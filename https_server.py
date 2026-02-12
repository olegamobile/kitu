import http.server
import ssl
import os
import ipaddress
from datetime import datetime, timedelta, timezone

# Настройки
port = 8000
directory = "dist"
cert_file = "cert.pem"
key_file = "key.pem"
server_ip = "192.168.1.230"

def generate_self_signed_cert():
    """Генерирует cert.pem и key.pem средствами Python (нужна библиотека cryptography)"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        
        print("Генерация сертификата...")
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "RU"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "None"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "None"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Dev"),
            x509.NameAttribute(NameOID.COMMON_NAME, server_ip),
        ])
        
        # Используем современный datetime
        now = datetime.now(timezone.utc)
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            now
        ).not_valid_after(
            now + timedelta(days=3650)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.IPAddress(ipaddress.ip_address(server_ip)),
                x509.DNSName("localhost")
            ]),
            critical=False,
        ).sign(key, hashes.SHA256())
        
        with open(key_file, "wb") as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ))
            
        with open(cert_file, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
            
        print("Сертификат успешно создан!")
        return True
    except ImportError:
        print("Ошибка: Библиотека 'cryptography' не найдена.")
        print("Выполните: pip install cryptography")
        return False
    except Exception as e:
        print(f"Ошибка при генерации: {e}")
        import traceback
        traceback.print_exc()
        return False

def start_server():
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        if not generate_self_signed_cert():
            return

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=directory, **kwargs)

    httpd = http.server.HTTPServer(('0.0.0.0', port), Handler)

    # Настройка SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=cert_file, keyfile=key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    print(f"\n✅ Сервер запущен: https://{server_ip}:{port}")
    print("Игнорируйте предупреждение браузера о 'небезопасном' соединении.")
    httpd.serve_forever()

if __name__ == "__main__":
    start_server()