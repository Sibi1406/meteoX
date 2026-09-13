const path = require("node:path");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const endpoint = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
const payload = {
  pipelineTasks: [
    {
      taskType: "translation",
      config: {
        language: {
          sourceLanguage: "en",
          targetLanguage: "ta",
        },
      },
    },
  ],
  inputData: {
    input: [{ source: "Rain is expected tomorrow" }],
  },
};

async function main() {
  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: process.env.BHASHINI_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error(`HTTP ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  }
}

main();
