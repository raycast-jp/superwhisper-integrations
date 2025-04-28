#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Check SuperWhisper Recordings
// @raycast.mode inline
// @raycast.refreshTime 1s
// @raycast.packageName SuperWhisper Tools

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sendMail, sendToSlackApi } = require('./external-integrations');
const dotenv = require('dotenv');
dotenv.config();
const RECORDINGS_DIR = '/Users/myano/Documents/superwhisper/recordings';
const LAST_CHECK_FILE = path.join('last-superwhisper-check.json');

function getTimestampFromPath(filePath) {
  const match = filePath.match(/\/(\d{10})\/meta\.json$/);
  return match ? parseInt(match[1], 10) : 0;
}

function getLatestRecording() {
  const metaFiles = execSync(`find "${RECORDINGS_DIR}" -name meta.json`).toString().trim().split('\n');

  if (metaFiles.length === 0 || (metaFiles.length === 1 && !metaFiles[0])) return null;

  const recordingsWithTime = metaFiles
    .map(metaPath => {
      if (!fs.existsSync(metaPath)) return null;
      return {
        path: metaPath,
        time: getTimestampFromPath(metaPath)
      };
    })
    .filter(r => r !== null && r.time > 0)
    .sort((a, b) => b.time - a.time);

  return recordingsWithTime.length > 0 ? recordingsWithTime[0] : null;
}

function getAllNewerRecordings(lastCheckedTime) {
  const metaFiles = execSync(`find "${RECORDINGS_DIR}" -name meta.json`).toString().trim().split('\n');

  if (metaFiles.length === 0 || (metaFiles.length === 1 && !metaFiles[0])) return [];

  return metaFiles
    .map(metaPath => {
      if (!fs.existsSync(metaPath)) return null;
      const timestamp = getTimestampFromPath(metaPath);
      return {
        path: metaPath,
        time: timestamp
      };
    })
    .filter(r => r !== null && r.time > 0 && r.time > lastCheckedTime)
    .sort((a, b) => a.time - b.time);
}

function getLastCheckData() {
  try {
    if (fs.existsSync(LAST_CHECK_FILE)) {
      return JSON.parse(fs.readFileSync(LAST_CHECK_FILE, 'utf8'));
    }
    console.log('Initializing new last-superwhisper-check.json file');
    const latestRecording = getLatestRecording();
    const initialData = { lastCheckedTime: latestRecording ? latestRecording.time : 0 };
    
    if (latestRecording) {
      console.log('Recording initial timestamp:', latestRecording.time);
    } else {
      console.log('No recordings found during initialization');
    }
    
    fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify(initialData));
    return initialData;
  } catch (error) {
    console.error('Error reading/creating last check data:', error);
    return { lastCheckedTime: 0 };
  }
}

function saveLastCheckData(data) {
  try {
    fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving last check data:', error);
  }
}

function main() {
  const lastCheckData = getLastCheckData();
  
  console.log('Last check data:', lastCheckData);

  const newerRecordings = getAllNewerRecordings(lastCheckData.lastCheckedTime);
  if (newerRecordings.length === 0) {
    console.log('No new recordings found');
    return;
  }

  console.log(`Found ${newerRecordings.length} new recording(s)`);
  
  let latestProcessedTime = lastCheckData.lastCheckedTime;
  
  for (const recording of newerRecordings) {
    try {
      const meta = JSON.parse(fs.readFileSync(recording.path, 'utf8'));
      const title = `SuperWhisper Recording - ${new Date(recording.time * 1000).toLocaleString()}`;
      const content = meta.llmResult || 'No transcription available';
      
      console.log(`Processing recording:${title}, content:${meta.llmResult}`);

      if(meta.llmResult == undefined || meta.llmResult === "") {
        console.log('Skipping recording:', title);
        continue;
      }
      sendToSlackApi(title, content, process.env.SLACK_BOT_TOKEN, process.env.SLACK_CHANNEL_ID);
      sendMail(title, content, {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          from: process.env.MAIL_FROM,
          to: process.env.MAIL_TO,
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        });
        console.log('Successfully processed recording:', recording.path);
        latestProcessedTime = Math.max(latestProcessedTime, recording.time);
    } catch (error) {
      console.error(`Error processing ${recording.path}:`, error);
    }
  }

  lastCheckData.lastCheckedTime = latestProcessedTime;
  saveLastCheckData(lastCheckData);
}

main();