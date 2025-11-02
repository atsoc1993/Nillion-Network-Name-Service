#!/usr/bin/env python3

import os
import asyncio
import json
import uuid
from dotenv import load_dotenv

from secretvaults.common.keypair import Keypair
from secretvaults.builder import SecretVaultBuilderClient
from secretvaults.common.blindfold import BlindfoldFactoryConfig, BlindfoldOperation
from secretvaults.dto.builders import RegisterBuilderRequest
from secretvaults.dto.collections import CreateCollectionRequest
from secretvaults.dto.data import (
    CreateStandardDataRequest,
    FindDataRequest,
)
from secretvaults.dto.common import Name

load_dotenv()


def check_environment():
    required_vars = [
        "BUILDER_PRIVATE_KEY",
        "NILCHAIN_URL",
        "NILAUTH_URL",
        "NILDB_NODES",
    ]

    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📝 Please copy .env.example to .env and add your private key:")
        print("   cp .env.example .env")
        print("\nThen edit .env with your configuration values.")
        return False

    return True


config = {
    "NILCHAIN_URL": os.getenv("NILCHAIN_URL"),
    "NILAUTH_URL": os.getenv("NILAUTH_URL"),
    "NILDB_NODES": os.getenv("NILDB_NODES", "").split(","),
    "BUILDER_PRIVATE_KEY": os.getenv("BUILDER_PRIVATE_KEY"),
}


async def main():
    print("🚀 Starting SecretVault Builder Standard Data Example")
    print("=" * 60)

    if not check_environment():
        return

    print("\n1️⃣ Creating keypair...")
    keypair = Keypair.from_hex(config["BUILDER_PRIVATE_KEY"])
    print(f"✅ Keypair created for DID: {keypair.to_did_string()}")

    print("\n2️⃣ Preparing client configuration...")
    urls = {
        "chain": [config["NILCHAIN_URL"]],
        "auth": config["NILAUTH_URL"],
        "dbs": config["NILDB_NODES"],
    }
    print(f"✅ Configured {len(urls['dbs'])} database nodes")

    print("\n3️⃣ Creating SecretVaultBuilderClient with blindfold encryption...")
    async with await SecretVaultBuilderClient.from_options(
        keypair=keypair,
        urls=urls,
    ) as builder_client:

        print("\n4️⃣ Refreshing root token...")
        await builder_client.refresh_root_token()
        print("✅ Root token obtained")

        print("\n5️⃣ Checking subscription status...")
        try:
            subscription_status = await builder_client.subscription_status()
            if subscription_status.subscribed:
                print("✅ Subscription is ACTIVE")
            else:
                print("❌ Subscription is INACTIVE")
        except Exception as e:
            print(f"⚠️  Could not check subscription status: {e}")

        print("\n6️⃣ Registering builder...")
        try:
            register_request = RegisterBuilderRequest(
                did=builder_client.keypair.to_did_string(), name=Name("standard-data-example-builder")
            )
            register_response = await builder_client.register(register_request)

            if hasattr(register_response, "root"):
                has_errors = False
                for node_id, response in register_response.root.items():
                    if hasattr(response, "status") and response.status != 201:
                        has_errors = True
                        break

                if has_errors:
                    print("ℹ️  Builder appears to already be registered.")
                    print("   This is normal if the builder was previously registered.")
                else:
                    print("✅ Builder registered successfully!")
            else:
                print("✅ Builder registered successfully!")

        except Exception as e:
            print(f"ℹ️  Builder appears to already be registered: {e}")

        print("\n7️⃣ Reading builder profile...")
        try:
            profile = await builder_client.read_profile()
            if hasattr(profile, "data") and profile.data:
                profile_data = profile.data
            else:
                profile_data = profile

            print(f"✅ Profile loaded - ID: {getattr(profile_data, 'id', 'Unknown')}")
            print(f"   Collections: {len(getattr(profile_data, 'collections', []))}")
            print(f"   Queries: {len(getattr(profile_data, 'queries', []))}")
        except Exception as e:
            print(f"❌ Failed to read profile: {e}")

        print("\n8️⃣ Creating collection...")
        collection_id = str(uuid.uuid4())

        try:
            with open("./backend/schema.json", "r", encoding="utf-8") as f:
                schema_data = json.load(f)

            create_request = CreateCollectionRequest(
                id=collection_id,
                type=schema_data["type"],
                name="Nil-NS",
                schema=schema_data["schema"],
            )

            await builder_client.create_collection(create_request)
            print(f"✅ Collection created with ID: {collection_id}")

        except Exception as e:
            print(f"❌ Failed to create collection: {e}")
            return
        
if __name__ == "__main__":
    asyncio.run(main())