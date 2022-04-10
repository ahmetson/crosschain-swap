> Date: MARCH-APRIL 2022, ISTANBUL, TURKEY.

For a long day, I didn't write anything, nor any code, since I was digging into the different architecture solutions. I went deep into cryptography, distributed systems. Here is the nodes that I had on my last notebook, to summirize what come up to my mind.

Each note will be numerated according to their appearance. Then at the end I will write the final note, most likely in the new file, to have edited short architecture design.

Hope you will find it interesting. To analyze the evolution of the decision about ARA network.

I will add under the title, the comment explaining the reason of writing the note.

*I provide the notes as it is, without edition.*

------------------------------------------------------------------
# 1 Trustless bridge of assets
------------------------------------------------------------------

Assets are not controlled by bridge.
The work of Bridge is verifiable.

[Diagram of Ara network architecture](1.1.jpg "Architecture of the Ara network") .

* *A - blockchain A*
* *B - blockchain B*
* *Br - Bridge*
* *V - verifiers*
* *U - user*

more onlie, more relaible that 51% honest,

One route is chosen. If it's not working in 20 seconds, then need to get the second route.

```
App = 
    verify Tx(fnType, tx, sourceId)

    generate signature(amount, nonce) !highRate
                |
            signature
```

*highRate* means, high rating nodes, and the node is connected to the 3 high rating nodes.

Three nodes from user to verify. Three nodes from Verifier to Signature generator.

------------------------------------------------------------------
# 2. What is Xdex
This came to mind after reading Tanenbaum's Distributed Systems book.

------------------------------------------------------------------

Xdex is a distributed system that has three isolated parts:
* Blockchain A
* Blockchain B
* Ara bridge.

The three parts act on a single interface for the user.

We assume that any component can (**actually can't**) trust any other component. So they verify their data as much as possible.

Assume that we put all data is calculated by Ara bridge, and only final result is going to Blockchain B, in that case point failure is Ara chain. If a malicious hacker couldhack Ara bridge, then a cracker could send any data to Blockchain B.

By adding a verification to blockchain, we set a point of failure on Blockchain B.

So if Ara bridge is not working properly, then Blockchain B simply would not allow the trasaction.

The choice of Blockchain as the point of failure taken, assuming blockchain with its all network consensus is more secure, I also considired the maturity of the decentralized ledger technology in contrast to less popular and young innovation of Ara bridge.

```
+---------------------------------------------+
| Zeromq doesn't use a broker, it passes      |
| messages to other parts directly.           |
| Implement zero + dht on smartcontract       |
+---------------------------------------------+
```

We have message which is coded to 15 out of 30 nodes. The

Then node gets the address message and computes the next destination:

```
next dest = (15 (13 + 3)) % 30
            // 13 is IP + 2 is from address.
next dest = (15 + 16) % 30
next dest = 1
```

if message doesn't come from node 15, then we draw a triangle, and go to the first node by destination on higher number. Then we add amount of triangles lines.

If 4 random nodes were not picked in 8 attempts, then transaction is counted as unavailable.

In order to create a transaction user has to increment the difficulty.

If the message doesn't go to the destination, then the node increase the difficulty to get a new destination node.

```
H(Message bytes) till first of value != 00, then -> hash, nonce.

// Get the node id
hash % node amount = id.

// node[2] of nodes of rectangle on ring from 30 nodes;
where first node = caller, 
    second node = destination;
and rectangle on ring:
  [] from first node, second node;
and ring:
    list of nodes;
    then value[0] -> ver1,
    value[1] -> ver 2;

// make the announcement to verifiers
send command (hey_ver) to ver 1 -> send 1.
if send 1.status not delivered then user generates the message. It pickes 3 other nodes that will handle the task.
```

The three nodes are running the task. Then cache will find a high ranked node to send data.

Each high ranked node verifiers what is recieved.

It produces its own data.

Then sends to user and caller, + two other signers.

Every node is connected to other nodes on route to check is online.

They will send data to pusher. 

When pusher receives a message, it pushes the signatures,
the smartcontract will check that the route is valid.

------------------------------------------------------------------
# 3. Ara node
It's the plan of writing Ara network's node in Rust, while I was reading the Rust book.

------------------------------------------------------------------

When it's running, it connects to the blockchain, it connects to the db. If there are not synced, then it will show an error, saying it can't connect and waiting.

We will create a bot that could run few dozens of ara nodes.

When wallet connected it will open an RPC. 

When synced, it will try to register itself. User would need, an account with some funds.

There is a sample UI whre user creates a transaction on Blokchain A.

Ara node listens to the blockchain and calculates the hash. If the hash is (**not**) there, then they will execute it. Then they will call next node:
```
verify that tx is valid
calculate amount
```

On Blockchain B, if 3 routes with the same tx, then it will be confirmed.

------------------------------------------------------------------
# 4. Ara network - decentralized public computation network.
This is explanation of Ara network as the secure multiparty computation network.
Inital idea was to have a signature generators that submits the code to the blockchain, and decentralized verifiers. Signature submitters should get access from verifiers only. So, how we can store the signatures? I found about the Threshold ECDSA and multiparty computation.

Throughout learning zeromq, I found a global DNS solution attempt. And while reading their github page, I found information about Distributed Protocol. Its a protocol, for p2p systems, where all node information is stored in a central place that is accessed by all nodes.

------------------------------------------------------------------

Ara network &ndash; a decentralized public computer network.

In order to execute an app, you need to have a distributed network, that is not owned by anyone.

But it has a problem, such that, if you want to proof the credibility of the result, in another place that has no access to the blockchain, then current smartcontract platform are not allowing that.

There are some solutions that require token to be staked, yet amount that is required is not what an average computer could allow.

Such a network for ara should be public, that it could connect to any computer of more than 10k nodes. Yet to be completely secure.

Ara network uses the blockchain as a distributed protocol that has a list of all nodes on the network.

When a node wants to call the application, the application is split to the functions, where first transaction is send to random node on the network. Node after execution sends the data to the next algorithmicly picked node. Finally, the last node sends the data to the blockchain. In the blockchain, the smartcontract checks that the route of nodes is correct, then accepts the transaction.

[Example diagram of algorithmically chosen route](4.1.jpg "Example route") .
The *hash* is 2501, close to node 2500. So node 2500 starts.
Then it picks 10,000. It sends to node 10,000 the data.

On the blockchain, smartcontract checks the route and then confirms the transaction.

Users can transfer large amount of tokens more securely, by splitting it to the few small amounts.

We assume that the 51% of nodes are honest. To enable it, we ask nodes to lock 20 CWS.

---
# 5 lecture notes
---
Homomorphic, multiparty computation.
Homomorphic is expensive computation, cheap connection.
MPC is cheap computation, expensive connection.

## Crash course of SMPC on youtube
MPC - a set of cryptographic techniques that allows a function while revealing only output, without input.

Passive or semihonest adversary. Follows protocol faithfully, but tries to learn more about input.

Active adversary. Parties can deviate arbitrarily from the protocol specification.

Categorization based on the number of malicious adversaries.

t = corrupted parties.
n = amount of parties.

- t < n - 1 is called **dishonest majority**
no input leak if t = n - 1. Hard to realize, less efficient. Strong guarantees. Less output guarantee.

- t < n/2 is called **honest majority**
weak privacy. not leak of input as long as dishonest are minorty. Easier to achieve. Better output guarantees.

- t < n/3 of dishonest

## how to measure the distributed cryptographic protocol security.
Found a lecture link on youtube from Awesome MPC link on github.

1.2 Universally composable security by Ran Caretti.
* What we want from Security analysis?
* Describe realistic attacks.
* Specify the security concerns and properties in a meaningful and precise way.
* capture all realistic attacks in the expected execution environment.

1.3 Modelling distributed nets. 
* CSP (HOARE)
* pi - calculus, spi - calculus
* IO automata

Hard to model the concerns.

Cryptographic modelling
* Semantic security
* Zero knowledge
* Commitment
* Secure function evaluation, simple captures cryptographic security.
Its not modular.

Want both:
* modular, easy
* be able to to tradeoff betweeen abstract/simple <-> complex/concrete

1.4 
1 step: model computer systems and attacks.
* You want to capcture (process, cores, ram, disk, network, process, os, app, delay, time, randomness)
* Model attack: network, exploit, side channel, Human
2. step: capture security properties
* trace property, in each execution, if event C happens, then event E happens.
* probability statement.
* Secrecy/privacy - no clear definition
* Liveness
* Timing of events
* Costs and quantative tradeoffs.
* Combination.

3 step: Prove that a system satisfies a given set of properties.

1.5 Specify an ideal service
Specify how you would see and how externally its seen.
Design ideal F, and build the system P.
**If P looks the same as F to external environment, then P is secure**.


--------------------------------------------------------
# 5. Calculation of the cost of hacking the Ara network and economics of profit
Also, explaining how to make it universal.

--------------------------------------------------------
10K * 20 CWS * $4 = 200,000 CWS * 4$ = 800k $.
Assume 10k nodes, and each CWS costs four dollars.

10k ip addresses on VPS per month * 80k. 

Finding the right addresses, plus nonce = 50 minute per account * 10k = 500k minute = 347 hours.

If nodes are coming to quickly, then the staking price is increasing linearly.

The 10,000th node would have to add the 20,000 CWS.

Assuming defleationry property of CWS, price due to previous locks of CWS, the adversiary actore would need 200,000 dollars.

Ara network keeps the order of application internally. They
It's aimed to be used as generic platform. Any app developer could pay to nodes on their own token, by locking it up on blockchain for 2 years. In this case, the transaction should be confirmed by 1/3 of the nodes.

The first application XDEX on 1 billion annual trading would generate CWS worth 0.3% of 1 billion or 3 million dollars.

Assuming that Ara is run by 2k nodes, each node could get 125$ per month. Paying 25$ per month to the hosting, each node could get 100$ profit.

Another application could be bridge of nfts. For each transaction, Ara network could get another form of income.

Ara could be used for Seascape network to create the multisig account on behalf of the user.

Ara network also can be used to create a decentralized network of email server.

--------------------------------------------------------
# I got to tend to write the compltex apps. To make the universal app.

--------------------------------------------------------
I was digging into Racket. Then start to focus on thinking about DSL (domain specific language). Then I tried to apply the DSL for my dreams or current work that I am doing: writing DSL for writing smartcontracts with syncers.

I tried to work on the TPL 2. 

I tried to work on the Maydan programming language for distributed systems.

I went deep to zeromq, to try to integrate it into the development of ara networks, then went into the recommended articles, videos to more realizations of zeromq paradigm.

---

# 6 Applied cryptography notes
Lectures from Udacity. I went into it, since I already started to read about cryptography. And this lectures at the last unit describes the MPC

---

Cryptography &ndash; branch of math in CS.

Crypto - secret, hide
Graph - write

Logy - science

Cryptology - science of secret.

Side-channel - absorving the other parameters, except the m, ciphertext.

Timing side-channel - absorb how long it takes to encrypt.

Symmetric Cryptosystem uses the same key for encryption and decryption.

Kirckoff's principle: E, D public, K is secret.

∀ - for all, for any

Correctness property:
∀ m, K: D<sub>K</sub>(E<sub>K</sub>(m)) = m

Security property:
Cyphertext doesn't expose anything about plaintext or key.

Ω (omega), set of all possible outcomes in probability. It's called probability space.

Uniform distribution &ndash; each outcome is equally likely.

Σ (sigma) sum of.
Σ <sub>w ∈ Ω</sub> P(W) = 1

event is a subset of outcome space.

In coin flip example:
Heads = {H}

∩ (intersection) means and.

Perfect Cipher: 
No additional info about message to the attacker.

P(m = m<sup>*</sup>|E<sub>K</sub>(m) = 0) = P(m = m<sup>*</sup>)
Conditional Probability: P (A|B) = P(A ∩ B) / P(B)

Perfect Cipher is impractical according to Shannon's theorem.

Modern Symmetric Cipher could be encrypting over Stream or Block.

Stream follows the Lorenz, using the modern computer hardware.

Block example is AES (Advanced Encrypted Standard). Ryndael be Belgium cryptogrophers.

All involve XOR, round key. Shift generation and non-linearity are needed for breaking the encryption. It goes in multiple rounds.

## Unit 2
2 assumptions about keys:
1. K is uniformly random.
2. K can be kept secret, but shared.

Kolmogorov Complexity: 
A sequence is random, if the shortest program generating the S is greater than S.

Randomness: S = P + C.

K. complexity is uncomputable. So other way to look.
Sequence generation should be unpredictable.

Given S = x<sub>1</sub>...x<sub>i</sub> ∈ [0, 2<sup>n-1</sup>]
even, after seeing x<sub>1</sub>...x<sub>m-1</sub>, adversary can only guess x<sub>m</sub> with probability 1/2<sup>n</sup>

Electronic codebook mode: each m encrypted to the c.
* cypher block chain. (CBC)
C<sub>0</sub> = E<sub>K</sub>(m<sub>0</sub> XOR IV)
C<sub>i</sub> = E<sub>K</sub>(m<sub>i</sub> XOR C<sub>i-1</sub>)
m<sub>0</sub> = D<sub>K</sub>(C<sub>i</sub>) XOR IV
m<sub>i</sub> = D<sub>K</sub>(C<sub>i</sub>) XOR C<sub>i-1</sub>


* counter (CTR)
c<sub>i</sub> = E<sub>K</sub>(n || i) XOR m<sub>i</sub
m<sub>i</sub> = C<sub>i</sub> XOR E<sub>K</sub>(n || i) 

IV - initial vector, unpredictable one-time value.
n nonce
|| concatenate.

* cipher feedback mode (CFB)
x<sub>i</sub> = x<sub>i-1</sub>[S:] || c<sub>i-1</sub>
x<sub>0</sub> = IV 

c<sub>i</sub> = E<sub>K</sub>(x<sub>i</sub>) [S:] XOR m<sub>i</sub>


---
# Ara network

After long time of research, I find out the initial way without Multiparty is much more simpler and easier to develop. So recapping the final variant, as I thought.

I also avoid the drawing of rectangle and triangles in the hash circle. There is much more simpler way to realize it.

---

## Noe punishment and registration

hash(ip, address) -> node UID

registration in Ara network:
* create a hash
* pick a port
* create a wallet
* get 2000 ORE -> from global configuration as registration fee 
* submit node to B<sup>A</sup> -> submission process
* submit node to B<sup>B</sup> -> submission process

submission process:
* 1 approve to take register fee on B<sup>B</sup>
* submit node to B<sup>A</sup>
* transaction gets signature of submission.
* nodes submit node to B<sup>B</sup>

If no transaction since 24 hours, node can submit itself. **too complicated**.

Hash that is used for generating the UID is 32 bytes. First *n* bytes are 0. The last 4 bytes are UID.

One IP address could have multiple nodes, up until one will not be involved in a transaction. In that case, other nodes on he same IP are banned. Their ORE are distributed among other nodes.

Distribution could be called by any node that processed at least 1 transaction. For detecting a node, the contract initiator gets 5 ORE. 5 ORE is in the global configuration.

The node can remove up to 5 nodes in each transaction. It's because of smartcontract limitations.


## Removal from the distributed protocol
The 2000 ORE is removed after 1 year of locking. If node removes his tokens, that will remove the node from the distributed protocol.


## Swap process of small amount
Any user's swap transaction involes three parts: S<sup>1</sup>, A, S<sup>2</sup>

* S<sup>1</sup> is the smartcontract either on B<sup>A</sup> or smartcontract on B<sup>B</sup>
* A is the bridge. Its named after Ara network.
* S<sup>2</sup> is the smartcontract on B<sup>A</sup>, if S<sup>1</sup> on B<sup>B</sup>, or its the smartcontract on B<sup>B</sup> if S<sup>1</sup> on B<sup>A</sup>.

User deposits his asset on S<sup>1</sup>. The transaction along with chain id, nonce and signer address is used to generate a **Swap hash**. The hashing has 2 zeroes in the beginning. The remaining 32 bytes are used as identifier of nodes that will verify the transaction.

Swap Hash = 00,1234,5678,9012,3456,7890

The last 4 bytes is the node picker. The node whoise node UID is closest to the last 4 bytes is responsible for verification. Picking each 4 bytes for random 4 nodes is not optimized from smartcontract perspective.

Maybe the nodes on the 26 nodes are used to have checkers. Checkers send a request to the verifier. If within 15 seconds the verifier will not respond back, the checker's second node will execute the node. If none of the nodes respond, then user can recalculate the hash on S<sup>1</sup> to pick another nodes. **This approach is not user friendly**. 

Better approach is to wait for other nodes that after 4 minutes will not recreate the hash to pick another node.

Once the node verifies the data, he gets the *true* or *false* result. The verifier will pick the second node by regenerating the Swap Hash.

Swap Hash <sub>1</sub> = (Swap Hash, result, nonce)

The second swap hash needs to have 4 zeroes at the beginning. This way we prevent nodes from precalculation of the route easily.

After 4 swap hashes, if the result is matching for all nodes, then the route is counted as valid. If one of the nodes on the route has different value, then the majority of the route nodes will not execute the transaction. (**Actually it means the smartcontract will revert the transaction, since all 5 nodes should have the same value**)

The 4 nodes will mark the node with wrong result as invalid. 

If the result is false, then the last node will send the transaction to S<sup>1</sup>. Otherwise to S<sup>2</sup>.

S<sup>1</sup> or S<sup>2</sup> which gets the transaction will check that the route is correct, then it will transfer to user his tokens.

## Swap process of large amount of Sum
The amount that user is swapping could be very high. In that case, some nodes might not want to parse it. In the high amount of token swap, the amounts are divided into multiple small amounts.

For security reasons, let's use for example 0.5% as the cap. For minimal of 5 nodes. If the network has 40 nodes, then the cap is divided by 40/5. Then each swap could be divided to 0.0625% of total supply.

The more nodes join to the network, the safer it is. This might encourage honest people to join to the network.


## Economical details, and changing the algorithm to Thorchain model, instead Uniswap
Let's use Thorchain schema as it's easier to make cross-chain development of AMM.

Example: 
CWS price = 5 USD. ETH = 1000 USD. GLMR = 10 USD.
S<sup>1</sup> = Ethereum.
S<sup>2</sup> = Moonbeam.

User has 20K USD worth assets as liquidity to provide.

CWS/ETH ratio = 1/200
CWS/GLMR ratio = 1/2

Another user wants to swap 1K USD worth ETH to GLMR. Which means 1 ETH = 100 GLMR.

The technical details of the swapping process will be something like this:

S<sup>1</sup> uses a DEX aggregator, for example 1INCH. And swaps the 1 ETH to 200 CWS. Then the 200 CWS locked in S<sup>1</sup>.

The Ara network are listening to the S<sup>1</sup>. They generate the Swap Hash from the 200 CWS swap transaction.

On S<sup>2</sup> the Ara nodes transfer 100 GLMR - Network fee. The 100 GLMR is taken from DEX aggregator, buy using the CWS of the investors.

Now, user who wants to provide a liquidity, can add it as CWS either on S<sup>1</sup> or on S<sup>2</sup>. He locks his coins to not to withdraw immediately for **m** days. Its set after security considiration to avoid the panic sell attack.

The user gets liquidity fe that he shares with the Ara nodes. The locking is for preventing dump of CWS in case of price crash.

The S<sup>1</sup> and S<sup>2</sup> are tracking the price of CWS in USD. It gives the score of CWS price, if CWS price is increasing stabilly. Then with score we can be sure that most likely CWS will not crash down.

The more XDEX used the higher the price of CWS. The more users add liquidity the higher the CWS price, since it will be taken out from the circulation. That means CWS has high chances to increase in price than going down. Since CWS is used in other products, such as IDO, where CWS is burnt, then that will also increase the price of CWS. 


## When CWS reaches the moon, or its limit
At some point CWS might reach to certain price, not will not reach above that. Around that time, CWS should be in value for services that Seascape offers to the developers. The XDEX should be top-notch compared to the competitors in usability, maybe with walletless accounts.

## When CWS declines in price slowly
As nothing in this world is forever, the Ara network's high position too. Either people might stop to use Seascape, or worse case it will decline in the value.

Perhaps it could decline, due to competitors who have better offers. Perhaps it could decline in CWS price due to incompetent decision of decision makers. Or perhaps due to quality of code, and hack of the system.

There is no solution in such cases except some measurements to considirate when it happens. To slow the price crash, Seascape and Ara should be profitable while its used. Those who spend money, after certain period of time should have atleast 100% return of what they invested.

## When CWS crashes immediately
CWS should have a strong commmunity that could calm users from panic sell.


## Distributed protocol of Ara network on smartcontracts.

S<sup>1</sup> register node (ip, address)
* check that user has 2000 ORE
* check that IP wasn't used before.
* check that address is new.
* check the hash.
* Keep the hash's last 4 bytes as UID.

Storing the UID.
* If L0 not exists, we create it. Otherwise we use already created on.
* If L1 not exists, we repeat the task as for L0.
* During the creation of L0..L3 we increment the value of childAmount of upper level by 1.
* During the creation of L0..L3 we set the min and max values in the upper level.
* Each L*N* has amount of UIDs in this layer.

S<sup>2</sup> route verification(sig[5], appId, nonces[7], appCallNonce, data hash, appCaller, punishments[2])

Swap Hash = H(data + appId, appCallNonce + appCaller + nonce[0]) -> get last 4 bytes, after comparing the nonce for 00 prefixes.
Get the nearest UID for Swap Hash. Get the address of the node. 
Compare that Sig[0] == first UID.
If not, compare to punishment. If not in punishment and not the sig[0] then revert.
If punishment, then redistributed the node data.
Repeat the remaining of the sigs.
The sig[4] should match to the smartcontract caller.

At the end of verifications, give 10% to the sig[0], give 20% to sig[1..3], and 30% of swap fee to sig[5]. 

Punished account's address will be blacklisted. The IP address will be banned for 3 months.


Get address of UID or nearby hash.
L0 exists? Not then take min.
If min not exists, return error.
If min exists get the max, max in the inner levels.
Otherwise repeat the task with nested levels.
After approval, three nodes that approve either send a verification or not.


---
# 8 Final simplest yet secure design

Brainstorm

---

