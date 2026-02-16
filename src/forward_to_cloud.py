import json
import time
import requests
from requests.adapters import HTTPAdapter, Retry

# Your API Gateway endpoint (POST /ingest)
API_URL = "https://gfxxlediud.execute-api.us-east-2.amazonaws.com/prod/ingest"

# Configure retry strategy for reliability
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)

adapter = HTTPAdapter(max_retries=retry_strategy)
session = requests.Session()
session.mount("https://", adapter)

def forward_metadata(metadata: dict) -> bool:
    """
    Sends a metadata dictionary to the AWS ingestion endpoint over HTTPS (TLS 1.3).
    Returns True if successful, False otherwise.
    """

    try:
        response = session.post(
            API_URL,
            json=metadata,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if response.status_code == 200:
            print("Successfully forwarded metadata")
            return True
        else:
            print(f"Forwarding failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"Error forwarding metadata: {e}")
        return False
