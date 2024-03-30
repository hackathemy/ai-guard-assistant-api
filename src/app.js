const OpenAI = require('openai');
const core = require('openai/core');
const express = require('express');
const axios = require('axios');
require('dotenv').config({ path: '.env' });

const { OPENAI_API_KEY, ASSISTANT_ID, ETHERSCAN_API_KEY } = process.env;
const assistantId = ASSISTANT_ID;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

//=========================================================
//============== ROUTE SERVER =============================
//=========================================================

// Open a new thread
app.get('/thread', async (req, res) => {
  const thread = await createThread();

  console.log(thread.id); // thread_A9eA9Rx8LJh1Dd3N62rWaJUD
  threadId = thread.id;

  res.json({ threadId: thread.id });
});

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
    console.log(message);

    // Run the assistant
    runAssistant(threadId).then((run) => {
      const runId = run.id;

      // Check the status
      pollingInterval = setInterval(() => {
        checkingStatus(res, threadId, runId);
      }, 10000);
    });
  });
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

const buildMessageWithContractAddress = (contractSourceCode) => {
  return `
  이 solidity 컨트랙트를 해석해서 일반 사람들이 이해할 수 있는 말로 풀어서 설명해줘. 
  
  너가 해석할 컨트랙트 소스코드는 다음과 같아
  
  '''solidity
  ${contractSourceCode}
  '''

  20자 이내로 위험한지 안 위험한지 잘 말해봐!!!
  `;
};

const handleGetContractAddressByMethod = (data) => {
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
  const contractAddress = handleGetContractAddressByMethod(data);

  switch (chainId) {
    // zk Astart
    case '1261120':
      console.log('this chain id : zkAstar');
      return await getContractSourceCodeResultForZKAstar(contractAddress);

    // sepolioa
    case '11155111':
      console.log('this chain id : ethereum sepolia');
      return await getContractSourceCodeResult(contractAddress);

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

  console.log(response);

  return response;
}

async function checkingStatus(res, threadId, runId) {
  const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);

  const status = runObject.status;
  console.log(runObject);
  console.log('Current status: ' + status);

  // + Addition for function calling
  if (status === 'requires_action') {
    console.log('requires_action.. looking for a function');

    if (runObject.required_action.type === 'submit_tool_outputs') {
      console.log('submit tool outputs ... ');
      const tool_calls = await runObject.required_action.submit_tool_outputs
        .tool_calls;

      // Can be choose with conditional, if you have multiple function
      const parsedArgs = JSON.parse(tool_calls[0].function.arguments);

      console.log(parsedArgs);
      return res.json(parsedArgs);
    }
  }

  if (status == 'completed') {
    clearInterval(pollingInterval);

    const messagesList = await openai.beta.threads.messages.list(threadId);
    let messages = [];

    messagesList.body.data.forEach((message) => {
      messages.push(message.content);
    });

    return res.json({ messages });
  }
}

//=========================================================
//============== SOURCE CODE API ==========================
//=========================================================

async function getContractSourceCodeResult(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  console.log(`input query: ${address}`);
  //   contractAddress = '0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413'

  // extractEthereumContractAddress({"address":"0x514910771AF9Ca656af840dff83E8264EcF986CA"})

  const baseUrl = 'https://api.etherscan.io/api';

  const params = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    address: address,
    apikey: ETHERSCAN_API_KEY,
  });

  const response = await axios.get(`${baseUrl}?${params}`);
  // console.log('Contract Source Code:', response.data);

  // 일단 그냥 첫번쨰거만 ㄱㄱ

  console.log(response.data.status);
  console.log(response.data.message);
  console.log(response.data.result[0].ContractName);
  // console.log(result.result[0].SourceCode);
  // console.log(result.result[0].ABI);
  return response.data.result[0].SourceCode;
}

async function getContractSourceCodeResultForZKAstar(address) {
  console.log('------- CALLING AN EXTERNAL ETHERSCAN API ----------');
  console.log(`input query: ${address}`);

  const baseUrl = `https://zkatana.blockscout.com/api?module=contract&action=getsourcecode&address=${address}`;
  const response = await axios.get(baseUrl);

  // if !verified { ... 만약에 Verfied 안된거면 바로 이상하다고 response

  console.log(response.data.status);
  console.log(response.data.message);
  console.log(response.data.result[0].ContractName);
  // console.log(result.result[0].SourceCode);
  // console.log(result.result[0].ABI);
  return response.data.result[0].SourceCode;
}
