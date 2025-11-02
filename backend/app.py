from secretvaults.common.blindfold import BlindfoldFactoryConfig, BlindfoldOperation
from secretvaults.dto.data import (
    CreateStandardDataRequest,
    FindDataRequest,
    UpdateDataRequest
)
from secretvaults.builder import SecretVaultBuilderClient
import re
import google.protobuf
from cosmpy.protos.cosmos.tx.v1beta1 import tx_pb2
from secretvaults.common.keypair import Keypair
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from base64 import b64decode
import requests
import uuid
import os

load_dotenv()
app = Flask(__name__)
CORS(app)

fee_address = 'nillion1jpmen3g2xp2v37ekzkqqhcacv2n9sjs9m5m5lt'
collection_id = '4af7fa6f-5c3c-41e1-8ada-fd85d0538e21'

config = {
    "NILCHAIN_URL": os.getenv("NILCHAIN_URL"),
    "NILAUTH_URL": os.getenv("NILAUTH_URL"),
    "NILDB_NODES": os.getenv("NILDB_NODES", "").split(","),
    "BUILDER_PRIVATE_KEY": os.getenv("BUILDER_PRIVATE_KEY"),
}

keypair = Keypair.from_hex(os.getenv("BUILDER_PRIVATE_KEY"))

urls = {
    "chain": [config["NILCHAIN_URL"]],
    "auth": config["NILAUTH_URL"],
    "dbs": config["NILDB_NODES"],
}

@app.post('/get_names')
async def get_names():
    address = request.get_json()['address']
    print(address)
    find_data_request = FindDataRequest(
        collection=collection_id, filter={'address': address}
    )
    async with await SecretVaultBuilderClient.from_options(
        keypair=keypair,
        urls=urls,
    ) as builder_client:
        print("\n4️⃣ Refreshing root token...")
        await builder_client.refresh_root_token()
    
        data = await builder_client.find_data(body=find_data_request)
    return jsonify({'message': data.data})

@app.post('/resolve_name')
async def resolve_name():
    try:
        name = request.get_json().get('name', '').strip()
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if not name.endswith('.nil'):
            name = name + '.nil'
        
        find_data_request = FindDataRequest(
            collection=collection_id, filter={'name': name}
        )
        async with await SecretVaultBuilderClient.from_options(
            keypair=keypair,
            urls=urls,
        ) as builder_client:
            print("\n4️⃣ Refreshing root token...")
            await builder_client.refresh_root_token()
        
            data = await builder_client.find_data(body=find_data_request)
            rows = getattr(data, "data", data)
            
            if not rows or len(rows) == 0:
                return jsonify({'error': 'Name not found'}), 404
            
            return jsonify({
                'message': 'Success',
                'address': rows[0].get('address'),
                'name': rows[0].get('name')
            })
    except Exception as e:
        print(f"❌ Failed to resolve name: {e}")
        return jsonify({'error': str(e)}), 500

@app.post('/new_name')
async def await_payment_and_add_entry_to_db():
    got_tx_info = False
    response = requests.get(f"https://testnet-nillion-rpc.lavenderfive.com/tx?hash=0x{request.get_json()['txId']}")
    if response.json().get('error', {}).get('data', '') == 'transaction indexing is disabled':
        print(f'Transaction indexing was disabled for Lavenderfive RPC')
        response = requests.get(f"http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz/tx?hash=0x{request.get_json()['txId']}")
        if response.json().get('error', {}).get('data', '') == 'transaction indexing is disabled':
            print(f'Transaction indexing was disabled on Nilogy RPC')
            response = requests.get(f"https://nillion-testnet-rpc.polkachu.com/tx?hash=0x{request.get_json()['txId']}")
            if response.json().get('error', {}).get('data', '') == 'transaction indexing is disabled':
                print(f'Transaction indexing was disabled on Polkachu RPC')
            else:
                got_tx_info = True
        else:
            got_tx_info = True
    else:
        got_tx_info = True
    
    if got_tx_info:
        raw = b64decode(response.json()['result']['tx'])
        tx = tx_pb2.Tx()
        tx.ParseFromString(raw)
        tx_events = response.json().get('result', {}).get('tx_result', {}).get('events', [])
        check_for_amount_and_sender = False
        for event in tx_events:
            if event.get('type', '') == 'transfer':
                attributes = event.get('attributes', {})
                receiver = ''
                sender = ''
                amount = ''
                for attr in attributes:
                    key = attr['key']
                    if key == 'recipient':
                        receiver_value = attr.get('value', '')
                        if receiver_value == fee_address:
                            receiver = receiver_value
                            check_for_amount_and_sender = True
                    if check_for_amount_and_sender:
                        if key == 'sender':
                            sender = attr.get('value', '')
                        if key == 'amount':
                            amount = attr.get('value', '0unil').split('unil')[0]
                if receiver and sender and amount:
                    print(f'{sender} sent {amount} unil to {fee_address} with memo: {tx.body.memo}')
                    try:
                        entry = [
                            {"_id": str(uuid.uuid4()), "name": tx.body.memo, "address": sender},
                        ]
                        
                        create_data_request = CreateStandardDataRequest(collection=collection_id, data=entry)
                        async with await SecretVaultBuilderClient.from_options(
                            keypair=keypair,
                            urls=urls,
                        ) as builder_client:
                            print("\n4️⃣ Refreshing root token...")
                            await builder_client.refresh_root_token()
                        await builder_client.create_standard_data(create_data_request)
                        print(f"✅ Created record for {tx.body.memo}")
                        return jsonify({'message': "Success!"})

                    except Exception as e:  
                        print(f"❌ Failed to create data: {e}")
                        return

                    break
        
    else:
        return jsonify({'message': "Error validating transaction"})

def verify_twitter_link(twitter_link: str) -> bool:
    if not twitter_link:
        return False
    pattern = r'^https?://(?:www\.)?(?:twitter\.com|x\.com)/[a-zA-Z0-9_]+/?$'
    return bool(re.match(pattern, twitter_link))

@app.post('/update_name')
async def update_name():
    try:
        data = request.get_json() or {}
        meta_id = data.get('metaId')
        address = data.get('address')
        twitter_link = data.get('twitter_link')
        gmail = data.get('gmail')

        if not meta_id or not address:
            return jsonify({'error': 'metaId and address are required'}), 400

        filt = {'_id': meta_id, 'address': address}

        update_doc = {}

        if twitter_link is not None:
            if not verify_twitter_link(twitter_link):
                return jsonify({'error': 'Invalid Twitter link format. Must be https://twitter.com/username or https://x.com/username'}), 400
            update_doc['twitter_link'] = twitter_link
            update_doc['twitter_verified'] = True

        if gmail is not None:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@gmail\.com$'
            if gmail and not re.match(email_pattern, gmail):
                return jsonify({'error': 'Invalid Gmail format'}), 400
            update_doc['gmail'] = gmail

        if not update_doc:
            return jsonify({'error': 'No updatable fields provided'}), 400

        find_req = FindDataRequest(collection=collection_id, filter=filt)

        async with await SecretVaultBuilderClient.from_options(
            keypair=keypair,
            urls=urls,
        ) as builder_client:
            await builder_client.refresh_root_token()

            existing = await builder_client.find_data(body=find_req)
            rows = getattr(existing, "data", existing)
            if not rows or len(rows) == 0:
                return jsonify({'error': 'Name not found or access denied'}), 404

            upd_req = UpdateDataRequest(
                collection=collection_id,
                filter=filt,
                update={'$set': update_doc}
            )

            await builder_client.update_data(upd_req)

        return jsonify({'message': 'Success!', 'data': {**rows[0], **update_doc}})
    except Exception as e:
        print(f"❌ Failed to update data: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    port = 3000
    app.run(port=port, debug=True)

