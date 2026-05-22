"""
Simple server test - starts server and keeps it running
"""

import os
import uvicorn
from main import app

if __name__ == "__main__":
    print("=" * 60)
    print("Starting EV Charging Scheduler Backend")
    print("=" * 60)
    print()

    port = int(os.environ.get("PORT", 8001))

    print(f"Server starting on port {port}")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)

    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            reload=False,
            log_level="info"
        )

    except Exception as e:
        print(f"\nERROR: {e}")