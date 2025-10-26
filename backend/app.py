from secretvaults.common.blindfold import BlindfoldFactoryConfig, BlindfoldOperation
from secretvaults.dto.data import (
    CreateStandardDataRequest,
    FindDataRequest,
)
from secretvaults.builder import SecretVaultBuilderClient
import google.protobuf # DO NOT REMOVE THIS, MUST BE IMPORTED BEFORE THE SUBSEQUENT IMPORT
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
collection_id = 'c9f18be8-d729-4304-b665-8b1cdb844c52'

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

@app.post('/')
async def await_payment_and_add_entry_to_db():
    got_tx_info = False
    # response = requests.get(f"https://testnet-nillion-rpc.lavenderfive.com/tx?hash=0x{'5B05BA5843E6BB2965F9C4F77EB8D4C4EA102438E60635B6B4910A5AC618CB02'}")
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
        tx.ParseFromString(raw)  # if this fails, decode TxRaw then TxBody
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
                            blindfold=BlindfoldFactoryConfig(
                                operation=BlindfoldOperation.STORE,
                                use_cluster_key=True,
                            ),
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

if __name__ == "__main__":
    port = 3000
    app.run(port=port, debug=True)

