const OpenAI = require('openai');
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: '.env' });

//=========================================================
//============== CONST VALUES =============================
//=========================================================

const { OPENAI_API_KEY, ASSISTANT_ID, ETHERSCAN_API_KEY } = process.env;
const assistantId = ASSISTANT_ID;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Guard Snap API Documentation',
      version: '0.0.1',
      description: `
    \n  
    Our platform not only introduces AI Guard Snap, an innovative tool that leverages artificial intelligence to analyze smart contract codes, but we also expand our capabilities through our Public API service.
    \n
    Various wallet services and platforms of different natures can integrate this functionality via API calls, enabling them to check the safety of smart contracts and explain their terms to the average user as needed.
    \n
    Through this, we aim to lower the entry barriers for Web3 beginners across a multitude of environments.`,
    },
  },
  apis: ['src/app.js'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);

//=========================================================
//============== BUILD EXPRESS =============================
//=========================================================

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//=========================================================
//============== ROUTE SERVER =============================
//=========================================================

/**
 * @swagger
 * tags:
 *   - name: Assistant Operations
 *     description: Operations for about assistant api such as thread management or send message
 *   - name: Test Operations
 *     description: Test-related operations
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Test Operations]
 *     summary: Returns a test message for health checking from the API.
 *     responses:
 *       200:
 *         description: A test health checking message.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: this is health check message from api
 */

app.get('/health', async (req, res) => {
  const message = { response: 'this is test message from api' };
  sendResponse(res, 200, message);
});

/**
 * @swagger
 * /supported-chains:
 *   get:
 *     tags: [Assistant Operations]
 *     summary: Retrieves a list of supported blockchain names for AI Guard.
 *     responses:
 *       200:
 *         description: Returns an array of strings, each representing a supported blockchain by the API. This endpoint is useful for clients that need to display or process the range of blockchain networks supported.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 result:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["injective", "zk-Astar", "ethereum", "fhenix", "neon"]
 */

app.get('/supported-chains', async (req, res) => {
  const supportedChains = [
    'injective',
    'zk-Astar',
    'ethereum',
    'fhenix',
    'neon',
  ];

  sendResponse(res, 200, supportedChains);
});

/**
 * @swagger
 * /thread:
 *   get:
 *     tags: [Assistant Operations]
 *     summary: Creates a new thread and returns its ID.
 *     responses:
 *       200:
 *         description: The ID of the created thread.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 threadId:
 *                   type: string
 *                   example: thread_A9eA9Rx8LJh1Dd3N62rWaJUD
 */
app.get('/thread', async (req, res) => {
  console.log('------- CALLING CREATE A NEW THREAD ----------');

  try {
    const thread = await createThread();
    sendResponse(res, 200, { threadId: thread.id });
  } catch (error) {
    sendResponse(res, 500, { error: error.message });
  }
});

/**
 * @swagger
 * /message:
 *   post:
 *     tags: [Assistant Operations]
 *     summary: Interprets a smart contract for security checking and explain for common users.
 *     description: >
 *       This endpoint receives details of a smart contract transaction and returns an analysis. It aims to help users understand the implications of the transaction by highlighting potential risks or malicious patterns. This service is especially valuable for identifying vulnerabilities or malicious intents in contract interactions.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chainId:
 *                 type: string
 *                 description: The blockchain network ID.
 *                 example: "1261120"
 *               data:
 *                 type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     description: The blockchain transaction method.
 *                     example: "eth_sendTransaction"
 *                   params:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                           description: Sender's address.
 *                           example: "0xb0b9c5F027A59409579A6a9139c4E9BB29De5A4b"
 *                         to:
 *                           type: string
 *                           description: Recipient's address.
 *                           example: "0xdC0e4E9C1BF3Aa88Cd9BE32186a741cd893C78cA"
 *                         value:
 *                           type: integer
 *                           description: Amount of cryptocurrency to send.
 *                           example: 1000000000000
 *                         gasLimit:
 *                           type: string
 *                           description: Maximum gas provided for the transaction.
 *                           example: "0x5028"
 *                         maxPriorityFeePerGas:
 *                           type: string
 *                           description: Maximum priority fee per gas.
 *                           example: "0x3b9aca00"
 *                         maxFeePerGas:
 *                           type: string
 *                           description: Maximum fee per gas.
 *                           example: "0x2540be400"
 *     responses:
 *       200:
 *         description: Analysis result with a focus on potential risks and recommendations.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     long:
 *                       type: string
 *                       example: "This Solidity smart contract, named 'DragonHackedToken', extends a standard ERC20 token contract, commonly used in the Ethereum ecosystem for creating customizable cryptocurrencies. However, there's a critical modification in the 'transfer' function. Instead of transferring the specified amount of tokens from the sender's address to the intended recipient's address as is standard, it instead redirects all transfers to a specific hardcoded address (`0x02841DE559CDfD7bb0a90Bedc045D7330044bBFb`). This means, if someone tries to send this token to another address, the tokens will not reach the intended recipient but will instead go to this hardcoded address. This behavior is deceitful and can lead to loss of funds for the unsuspecting token holders. Therefore, this contract exhibits a malicious behavior that could be exploited to steal tokens from users. In summary, this contract has been deliberately designed to mislead users and reroute transactions. It represents a severe security risk and should be considered dangerous."
 *                     short:
 *                       type: string
 *                       example: "Very Dangerous!"
 */
app.post('/message', async (req, res) => {
  // Parsing body
  const { data, chainId } = req.body;

  // Switching By Chain ID
  const contractSourceCode = await handleGetContractSourceCode(data, chainId);
  if (contractSourceCode === undefined) {
    return res.json({ success: false, message: 'not supported chain' });
  }

  const thread = await createThread();
  const threadId = thread.id;

  addMessage(
    threadId,
    buildMessageWithContractAddress(contractSourceCode)
  ).then((message) => {
    // console.log(message);

    // Run the assistant
    runAssistant(threadId).then((run) => {
      const runId = run.id;

      // Check the status
      pollingInterval = setInterval(() => {
        checkingStatus(res, threadId, runId, chainId);
      }, 10000);
    });
  });
});

/**
 * @swagger
 * /create-custom-assistant:
 *   post:
 *     tags: [Assistant Operations]
 *     summary: Create a new assistant for wallet provider and other platforms, through this feature they could make a response data format which each want to get
 */
app.post('/create-custom-assistant', (req, res) => {
  sendResponse(res, 500, { error: 'not supported yet' });
});

//=========================================================
//============== START SERVER =============================
//=========================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//=========================================================
//============== UTILS FUNCTION ===========================
//=========================================================
const sendResponse = (res, statusCode, data) => {
  res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    result: data,
  });
};

const buildMessageWithContractAddress = (contractSourceCode) => {
  const isKorean = false;
  if (isKorean) {
    return `
    이 solidity 컨트랙트를 해석해서 일반 사람들이 이해할 수 있는 말로 풀어서 설명해줘. 
    
    너가 해석할 컨트랙트 소스코드는 다음과 같아
    
    '''solidity
    ${contractSourceCode}
    '''
  
    20자 이내로 위험한지 안 위험한지 잘 말해봐!!!
    `;
  } else {
    return `
    Interpret this Solidity contract into layman's terms so that ordinary people can understand it.

    The contract source code you will interpret is as follows:
    
    '''solidity
    ${contractSourceCode}
    '''
    
    In 20 characters or less, tell me if it's dangerous or not!
  `;
  }
};

const handleGetContractAddressByMethod = (data) => {
  console.log('------- HANDLER EXTRACT CONTRACT ADDRESS BY METHOD ----------');

  const method = data.method;
  const param = data.params[0];
  switch (method) {
    case 'eth_sendTransaction':
      const contractAddress = param.to;
      console.log('got contract address: ', contractAddress);
      return contractAddress;

    // etc
    default:
      return 'error message';
  }
};

const handleGetContractSourceCode = async (data, chainId) => {
  console.log('------- CALLING CONTRACT SOURCECODE BY EXTERNAL API ----------');
  const contractAddress = handleGetContractAddressByMethod(data);

  switch (chainId) {
    // zk Astart
    case '1261120':
      console.log('this chain id : zkAstar');
      return await getContractSourceCodeResultForZKAstar(contractAddress);

    // ethereum sepolioa
    case '11155111':
      console.log('this chain id : ethereum sepolia');
      return await getContractSourceCodeResultForEthereum(contractAddress);

    // inEVM
    case '2424':
      console.log('this chain id : inEVM');
      return await getContractSourceCodeResultForinEVM(contractAddress);

    // neon
    case '245022926':
      console.log('this chain id : neon');
      return await getContractSourceCodeResultForNeon(contractAddress);

    // etc
    default:
      console.log('this chain is not supported!');
      return undefined;
  }
};

//=========================================================
//============== OPENAI FUNCTIONS =========================
//=========================================================

// Set up a Thread
async function createThread() {
  console.log('Creating a new thread...');
  const thread = await openai.beta.threads.create();
  return thread;
}

// Add message with contract source code
async function addMessage(threadId, message) {
  console.log('Adding a new message to thread: ' + threadId);
  const response = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });

  return response;
}

async function runAssistant(threadId) {
  console.log('Running assistant for thread: ' + threadId);
  const response = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
    // Make sure to not overwrite the original instruction, unless you want to
  });

  // console.log(response);

  return response;
}

async function checkingStatus(res, threadId, runId, chainId) {
  const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);
  const status = runObject.status;

  console.log('Current status: ' + status);

  if (status == 'completed') {
    clearInterval(pollingInterval);

    const messagesList = await openai.beta.threads.messages.list(threadId);
    let messages = [];

    messagesList.body.data.forEach((message) => {
      messages.push(message.content);
    });

    return res.json({ messages });
  }

  // + Addition for function calling
  if (status === 'requires_action') {
    clearInterval(pollingInterval);
    // console.log('requires_action.. looking for a function');
    if (runObject.required_action.type === 'submit_tool_outputs') {
      // console.log('submit tool outputs ... ');
      const tool_calls = await runObject.required_action.submit_tool_outputs
        .tool_calls;

      // Can be choose with conditional, if you have multiple function
      const message = JSON.parse(tool_calls[0].function.arguments);
      message.chain_id = chainId;

      console.log('response message: ');
      console.log(message);

      sendResponse(res, 200, message);
    }
  }
}

//=========================================================
//============== SOURCE CODE API ==========================
//=========================================================

async function getContractSourceCodeResultForEthereum(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  const baseUrl = 'https://api.etherscan.io/api';
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    address: address,
    apikey: ETHERSCAN_API_KEY,
  });
  const response = await axios.get(`${baseUrl}?${params}`);
  return response.data.result[0].SourceCode;
}

async function getContractSourceCodeResultForZKAstar(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  const baseUrl = `https://zkatana.blockscout.com/api?module=contract&action=getsourcecode&address=${address}`;
  const response = await axios.get(baseUrl);
  return response.data.result[0].SourceCode;
}

async function getContractSourceCodeResultForinEVM(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  const baseUrl = `https://testnet.explorer.inevm.com/api?module=contract&action=getsourcecode&address=${address}`;
  const response = await axios.get(baseUrl);
  return response.data.result[0].SourceCode;
}

async function getContractSourceCodeResultForNeon(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  const baseUrl = `https://neon-devnet.blockscout.com/api?module=contract&action=getsourcecode&address=${address}`;
  const response = await axios.get(baseUrl);
  return response.data.result[0].SourceCode;
}
