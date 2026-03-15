heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ forge script script/DeployAetherGuard.s.sol:DeployAetherGuard     --rpc-url $SEPOLIA_RPC_URL     --private-key $PRIVATE_KEY     --broadcast     
[⠊] Compiling...
No files changed, compilation skipped
Traces:
  [1978150] → new DeployAetherGuard@0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519
    └─ ← [Return] 9768 bytes of code

  [3096] DeployAetherGuard::run()
    ├─ [0] VM::envUint("PRIVATE_KEY") [staticcall]
    │   └─ ← [Revert] vm.envUint: failed parsing $PRIVATE_KEY as type `uint256`: missing hex prefix ("0x") for hex string
    └─ ← [Revert] vm.envUint: failed parsing $PRIVATE_KEY as type `uint256`: missing hex prefix ("0x") for hex string


Error: script failed: vm.envUint: failed parsing $PRIVATE_KEY as type `uint256`: missing hex prefix ("0x") for hex string
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ source .env
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ forge script script/DeployAetherGuard.s.sol:DeployAetherGuard     --rpc-url https://ethereum-sepolia.publicnode.com --private-key PRIVATE_KEY=ae7935d459b0087dad41622fb2df4e91a42914078fd4075168568fd4c6ba2c30
     --broadcast     
Error: Failed to decode private key
--broadcast: command not found
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ forge script script/DeployAetherGuard.s.sol:DeployAetherGuard     --rpc-url https://ethereum-sepolia.publicnode.com --private-key ae7935d459b0087dad41622fb2df4e91a42914078fd4075168568fd4c6ba2c30
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
  Deploying AetherGuardController...
  ENS Domain: aetherguard.eth
  ENS Node: 0x2ccd2ca0a23461055d9a77af5d3463f1a0514fae103b1a8731d5835cd3383ac3
  Initial Agent: 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414
  AetherGuardController deployed at: 0x0B566c4e18D208a89fA1323E5313962e1af4a492

## Setting up 1 EVM.

==========================

Chain 11155111

Estimated gas price: 0.001000018 gwei

Estimated total gas used for script: 1188915

Estimated amount required: 0.00000118893640047 ETH

==========================

SIMULATION COMPLETE. To broadcast these transactions, add --broadcast and wallet configuration(s) to the previous command. See forge script --help for more.

Transactions saved to: /home/heeral/AetherGuard/contracts/broadcast/DeployAetherGuard.s.sol/11155111/dry-run/run-latest.json

Sensitive values saved to: /home/heeral/AetherGuard/contracts/cache/DeployAetherGuard.s.sol/11155111/dry-run/run-latest.json

heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ forge script script/DeployAetherGuard.s.sol:DeployAetherGuard     --rpc-url https://ethereum-sepolia.publicnode.com --private-key ae7935d459b0087dad41622fb2df4e91a42914078fd4075168568fd4c6ba2c30 --broadcast
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
  Deploying AetherGuardController...
  ENS Domain: aetherguard.eth
  ENS Node: 0x2ccd2ca0a23461055d9a77af5d3463f1a0514fae103b1a8731d5835cd3383ac3
  Initial Agent: 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414
  AetherGuardController deployed at: 0x0B566c4e18D208a89fA1323E5313962e1af4a492

## Setting up 1 EVM.

==========================

Chain 11155111

Estimated gas price: 0.001000018 gwei

Estimated total gas used for script: 1188915

Estimated amount required: 0.00000118893640047 ETH

==========================

##### sepolia
✅  [Success] Hash: 0x444df172a5e39e60ff4af49557391f1fe1ebeee6506f4c456778440cbc236c3f
Contract Address: 0x0B566c4e18D208a89fA1323E5313962e1af4a492
Block: 10384552
Paid: 0.00000091455823095 ETH (914550 gas * 0.001000009 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.00000091455823095 ETH (914550 gas * avg 0.001000009 gwei)
                                                                                                                                                   

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: /home/heeral/AetherGuard/contracts/broadcast/DeployAetherGuard.s.sol/11155111/run-latest.json

Sensitive values saved to: /home/heeral/AetherGuard/contracts/cache/DeployAetherGuard.s.sol/11155111/run-latest.json

heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ echo "View your contract: https://sepolia.etherscan.io/address/0x0B566c4e18D208a89fA1323E5313962e1af4a492"
View your contract: https://sepolia.etherscan.io/address/0x0B566c4e18D208a89fA1323E5313962e1af4a492
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Get your ENS node
export ENS_NODE=$(cast namehash aetherguard.eth)

# Verify the contract
forge verify-contract 0x0B566c4e18D208a89fA1323E5313962e1af4a492 \
    src/AetherGuardController.sol:AetherGuardController \
    --chain sepolia \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(bytes32,address)" $ENS_NODE 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414) \
    --watch
error: a value is required for '--etherscan-api-key <KEY>' but none was supplied

For more information, try '--help'.
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ 
 *  History restored 

heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ git clone https://github.com/Heeral03/v2-periphery^C
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Set your API key
export ETHERSCAN_API_KEY=78TYSZXGAMF84MA7AVR7MKIXZZZHCD9DJH

# Get your ENS node (if you haven't already)
export ENS_NODE=$(cast namehash aetherguard.eth)
echo "ENS Node: $ENS_NODE"

# Verify the contract
forge verify-contract 0x0B566c4e18D208a89fA1323E5313962e1af4a492 \
    src/AetherGuardController.sol:AetherGuardController \
    --chain sepolia \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    --constructor-args $(cast abi-encode "constructor(bytes32,address)" $ENS_NODE 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414) \
    --watch
ENS Node: 0x2ccd2ca0a23461055d9a77af5d3463f1a0514fae103b1a8731d5835cd3383ac3
Start verifying contract `0x0B566c4e18D208a89fA1323E5313962e1af4a492` deployed on sepolia
Constructor args: 0x2ccd2ca0a23461055d9a77af5d3463f1a0514fae103b1a8731d5835cd3383ac30000000000000000000000005bf8ae260fd33f5423c0e3e7457118162b9c5414

Submitting verification for [src/AetherGuardController.sol:AetherGuardController] 0x0B566c4e18D208a89fA1323E5313962e1af4a492.
Submitted contract for verification:
        Response: `OK`
        GUID: `4kxstukl9dzznx5p9uwnz2bamd1pj6qizkubumv9ue2fz73ftq`
        URL: https://sepolia.etherscan.io/address/0x0b566c4e18d208a89fa1323e5313962e1af4a492
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Check current merkle root (should be 0x00... initially)
cast call 0x0B566c4e18D208a89fA1323E5313962e1af4a492 "currentMerkleRoot()(bytes32)" --rpc-url $SEPOLIA_RPC_URL

# Update merkle root (as ENS owner)
cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492 "updateMerkleRoot(bytes32)" $(cast keccak256 "production root") --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KE^C
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ forge verify-contract 0x0B566c4e18D208a89fA1323E5313962e1af4a492     src/AetherGuardController.sol:AetherGuardController     --chain sepolia     --etherscan-api-key $ETHERSCAN_API_KEY     --constructor-args $(cast abi-encode "constructor(bytes32,address)" $ENS_NODE 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414)     -^Catch
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Check current merkle root (should be 0x00... initially)
cast call 0x0B566c4e18D208a89fA1323E5313962e1af4a492 "currentMerkleRoot()(bytes32)" --rpc-url https://ethereum-sepolia.publicnode.com

# Update merkle root (as ENS owner)
cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492 "updateMerkleRoot(bytes32)" $(cast keccak256 "production root") --rpc-url https://ethereum-sep
olia.publicnode.com --private-key ae7935d459b0087dad41622fb2df4e91a42914078fd4075168568fd4c6ba2c30
0x0000000000000000000000000000000000000000000000000000000000000000

blockHash            0xfdd47e32867937ee733d6d71c25126d2bc296d40ad54feb3b10fb9e1f8f4a0bc
blockNumber          10390862
contractAddress      
cumulativeGasUsed    10091286
effectiveGasPrice    1000009
from                 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414
gasUsed              51320
logs                 [{"address":"0x0b566c4e18d208a89fa1323e5313962e1af4a492","topics":["0x90004c04698bc3322499a575ed3752dd4abf33e0a7294c06a787a0fe01bea941"],"data":"0xba768c7e679ff36209663cfd5c66f1a8a73364822f4dbfe04dae9741b060329e","blockHash":"0xfdd47e32867937ee733d6d71c25126d2bc296d40ad54feb3b10fb9e1f8f4a0bc","blockNumber":"0x9e8d4e","blockTimestamp":"0x69a9b8b8","transactionHash":"0x2dd3dd94ce0082778d56936bad23b203510cb7618b7e676bac72505bfeb5c8ee","transactionIndex":"0x52","logIndex":"0xde","removed":false}]
logsBloom            0x00000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000008
root                 
status               1 (success)
transactionHash      0x2dd3dd94ce0082778d56936bad23b203510cb7618b7e676bac72505bfeb5c8ee
transactionIndex     82
type                 2
blobGasPrice         
blobGasUsed          
to                   0x0B566c4e18D208a89fA1323E5313962e1af4a492
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Try calling updateMerkleRoot again (should revert if modifier works)
cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492 \
  "updateMerkleRoot(bytes32)" \
  $(cast keccak "second test") \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key ae7935d459b0087dad41622fb2df4e91a42914078fd4075168568fd4c6ba2c30

blockHash            0xd185d2a0d0ea842be2fa4223191345dfafbdcc7847cfaa0d0007cd6c07cf373b
blockNumber          10390870
contractAddress      
cumulativeGasUsed    17189738
effectiveGasPrice    1000009
from                 0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414
gasUsed              34220
logs                 [{"address":"0x0b566c4e18d208a89fa1323e5313962e1af4a492","topics":["0x90004c04698bc3322499a575ed3752dd4abf33e0a7294c06a787a0fe01bea941"],"data":"0xe140de15f0a76edb8ccaf45b7dcafe67db558ee1817b88bc56f0b0c98763b001","blockHash":"0xd185d2a0d0ea842be2fa4223191345dfafbdcc7847cfaa0d0007cd6c07cf373b","blockNumber":"0x9e8d56","blockTimestamp":"0x69a9b918","transactionHash":"0xb78c44a6f0146752b24eaa6c584aa5d5181f1eb67a90ef1af8bc6e51afa2f3ef","transactionIndex":"0x7f","logIndex":"0xf6","removed":false}]
logsBloom            0x00000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000008
root                 
status               1 (success)
transactionHash      0xb78c44a6f0146752b24eaa6c584aa5d5181f1eb67a90ef1af8bc6e51afa2f3ef
transactionIndex     127
type                 2
blobGasPrice         
blobGasUsed          
to                   0x0B566c4e18D208a89fA1323E5313962e1af4a492
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Check the current merkle root (should be the new one)
cast call 0x0B566c4e18D208a89fA1323E5313962e1af4a492 \
  "currentMerkleRoot()(bytes32)" \
  --rpc-url https://ethereum-sepolia.publicnode.com
0xe140de15f0a76edb8ccaf45b7dcafe67db558ee1817b88bc56f0b0c98763b001
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ # Try with a different private key (not the ENS owner)
# First, generate a random private key for testing
export TEST_PRIVATE_KEY=$(cast wallet new | grep "Private key:" | awk '{print $3}')
export TEST_ADDRESS=$(cast wallet address $TEST_PRIVATE_KEY)

echo "Test address (not ENS owner): $TEST_ADDRESS"

# This should FAIL with "Not ENS owner"
cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492 \
  "updateMerkleRoot(bytes32)" \
  $(cast keccak "unauthorized attempt") \
  --rpc-url https://ethereum-sepolia.publicnode.com \
  --private-key $TEST_PRIVATE_KEY
Test address (not ENS owner): 0xe5989B98790ecF1fE9082cc670871e8b4389B8cA
Error: Failed to estimate gas: server returned an error response: error code -32000: insufficient funds for transfer
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492   "updateMerkleRoot(bytes32)"   $(cast keccak "unauthorized attempt")   --rpc-url https://ethereum-sepolia.publicnode.com   --private-key $TEST_PRIVATE_KEY
Error: Failed to estimate gas: server returned an error response: error code -32000: insufficient funds for transfer
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ cast send 0x0B566c4e18D208a89fA1323E5313962e1af4a492   "updateMerkleRoot(bytes32)"   $(cast keccak "unauthorized attempt")   --rpc-url https://ethereum-sepolia.publicnode.com   --private-key ^C
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ cast call 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e \
  "owner(bytes32)(address)" \
  0x2ccd2ca0a23461055d9a77af5d3463f1a0514fae103b1a8731d5835cd3383ac3 \
  --rpc-url https://ethereum-sepolia.publicnode.com
0x5Bf8Ae260FD33f5423C0e3e7457118162B9C5414
heeral@heeral-HP-Pavilion-Laptop-15-eg2xxx:~/AetherGuard/contracts$ \