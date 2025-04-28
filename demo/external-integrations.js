const nodemailer = require('nodemailer');
const https = require('https');

function createAppleNote(title, content) {
  const script = `
    tell application "Notes"
      tell account "iCloud"
        make new note with properties {name:"${title}", body:"${content}"}
      end tell
    end tell
  `;
  
  try {
    execSync(`osascript -e '${script}'`);
    return true;
  } catch (error) {
    console.error('Error creating note:', error);
    return false;
  }
}

function sendToSlack(title, content, config) {
  if (!config.slack || !config.slack.webhookUrl) {
    console.error('Slack Webhook URLが設定されていません');
    return false;
  }
  return axios.post(config.slack.webhookUrl, {
    text: `*${title}*\n${content}`
  }).then(() => {
    console.log('Slack送信成功');
    return true;
  }).catch((err) => {
    console.error('Slack送信失敗:', err);
    return false;
  });
}

function sendMail(title, content, config) {

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
  const mailOptions = {
    from: config.from,
    to: config.to,
    subject: title,
    text: content
  };
  return transporter.sendMail(mailOptions)
    .then(() => {
      console.log('メール送信成功');
      return true;
    })
    .catch((err) => {
      console.error('メール送信失敗:', err);
      return false;
    });
}

async function sendToSlackApi(title, content, botToken, channelId) {
  console.log('sendToSlackApi', title, content, botToken, channelId);
  if (!botToken || !channelId) {
    console.error('Slack botTokenまたはchannelIdが指定されていません');
    return false;
  }

  const data = JSON.stringify({
    channel: channelId,
    text: `*${title}*\n${content}`
  });

  const options = {
    hostname: 'slack.com',
    path: '/api/chat.postMessage',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.ok) {
          console.log('Slack API送信成功');
          resolve(true);
        } else {
          console.error('Slack API送信失敗:', response);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Slack API送信失敗:', e);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

module.exports = {createAppleNote, sendToSlack, sendMail, sendToSlackApi }; 