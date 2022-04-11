# The main contributor went to work on https://blocklords.com/

---

```
# Xdex &ndash; a trustless crosschain cryptocurrency dex

> **Xdex** is the code name of the project. The final name would be decided after it's release of MVP.

Any crosschain dapp has three parts (*whether it's a swap, or bridge*): 
* **Smartcontract on the first blockchain** 
* **Smartcontract on the second blockchain**
* **Offchain verifier/relayer**. 

The last part is responsible for transaction verification on the **Smartcontract on the first blockchain**. Then for submitting data to the **Smartcontract on the second blockchain**. 

Following **[Bitcoin](https://bitcoin.org/)** and **[Ethereum](https://ethereum.org)**, **Xdex** is an attempt to create a trustless bridge through decentralization. As such, **Xdex** tries to add three criterea to the **Offchain verifier/relayer**:
1. Any computer is allowed to join to the **Offchain verification/relaying** process, making it posible to make as a network of thousands, millions of nodes.
2. The cost of running the node is affordable for majority of the people, if it's uses a staking consensus, then amount of stake should be affordable to general users of the internet.
3. **Xdex** should run without it's founder. Simply, it should not have any owner behind it.

In order to match the critereas listed above, **Xdex** uses the **Arachyl** network, described below.

---

# Arachyl network &ndash; offchain verifier, relayer between two blockchains

**Arachyl network** is a p2p system with <ins>distributed protocol</ins> on blockchain, that verifies the message by randomly picked *N* nodes. Then **Arachyl network** relayes the message, with attached **Proof of Random route**. Since the *blockchain* has the <ins>distributed protocol</ins>, it can verify the randomness of the route.

> *<ins>Distributed protocol</ins> means the list of all nodes is hold in a single place, and the list of all nodes is available for all nodes in the network.*

In order to select the random node for message verification, the **Arachyl network** uses **Proof of Work** algorithm.

## Random node in distributed protocol with Proof of Work
Nodes in **Arachyl network** are given 4 bytes length UID.

Thus, we can represent the **Distributed Protocol** as a Ring from `0x01010101` to  4<sup>255</sup>.

// image of the Distributed protocol ring

The first step of crosschain process is a signing a transaction on the first *blockchain*. Then, making another transaction on the second *blockchain* that signalizes **Arachyl network** to verify the message. The **Offchain verifier/relayer** nodes are listening for the transactions on the second *blockchain*. Seeing the transaction of user, the nodes are running **Proof of Work** algorithm with difficulty *D* on a submitted request. 

From the *Hash* result, the node derives the UID of the message in the **Distributed protocol**. Then the node finds a nearby UID of the node by going in a Clock-wise direction in the *Ring*. If the UID matches to the current node's UID, then he will verify the message. Otherwise, he would keep trying the UID that matches for his node, or until he will not see that it was submitted.

The result of verification is used to generate the second message UID in the *Ring*. Then node sends the data to the closest node. If the closest node is not responding in 10 seconds, the current node is going over UID generation, to find the next online node. This process repeated four times. The last node then pushes the result to the second *blockchain* along with five signatures, nonces of previous nodes.

These five nodes wait for 10 minutes. And if none of the nodes are disapproving their behaviour, then each of them should create a route to approve their behaviour.

## Disapproving the false message submission
The **Arachyl network** keeps the rating of each node. The top 10% of the nodes can initiate the disapproval, if the submitted message is invalid. Only *P* amount of routes can be initiated within the 10 minutes.

These could prevent the adversiary node with large fund to use GPU to mining faster and pick adversiary route.

## Verification incentives from the Arachyl network
In order to incentify the top 10% of the nodes and approve behavioural nodes to be honest, the **Arachyl network** introduces a staking requirement. Any node that wants to be registered as an **Offchain verifier/relayer** has to stake small amount of tokens to the network. These amount of tokens are locked until the node is not deciding to leave.

When the nodes are pushing verification of the user's transaction, they put *A* amount of collateral tokens locked for 10 minutes.
The half of *A* is made from 50% of all node's tokens
plus 50% of the rest of **Arachyl network** nodes.

The user who want's to verify his message locks some *S* amount of collateral as well. If after 60 minutes of verification transaction, he doesn't get the result, then he would get a compensation from the **Arachyl network**.

If nodes are not honest, or not alive, then they have a chance to lose their tokens. At the end of the staking tokens, the node is blacklisted from the market.

## Argument toward Proof of Work
The **Proof of Work** argument is taken as the best considiration to create a route. Because some nodes can be offline along the route, therefore we need a way to proof a route among the online nodes.
