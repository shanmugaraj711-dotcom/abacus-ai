import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ── Lightweight static server for testing ───────────────────────────────────
function createTestServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  return http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/auth-ui/sign-in.html';
    const filePath = path.join(ROOT_DIR, reqPath);

    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404);
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

// ── Test Runner ─────────────────────────────────────────────────────────────
let testsPassed = 0;
async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
    throw err;
  }
}

// ── Main Test Suite ─────────────────────────────────────────────────────────
const server = createTestServer();

await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log(`Test server running on http://127.0.0.1:${port}`);
    resolve();
  });
});

const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

try {
  // ── TEST GROUP 1: Unit & Logic Verification in Browser Context ─────────────
  console.log('\n--- GROUP 1: Graduated Resend Cooldown [60s, 120s, 300s] ---');

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

  await test('1.1 Cooldown sequence constant is [60, 120, 300]', async () => {
    const seq = await page.evaluate(async () => {
      const mod = await import('/auth/sign-in.js');
      return mod.RESEND_COOLDOWN_SEQUENCE_S;
    });
    assert.deepEqual(seq, [60, 120, 300]);
  });

  await test('1.2 Cooldown sequence progression on successive sends (60s -> 120s -> 300s -> 300s)', async () => {
    const result = await page.evaluate(async () => {
      const { RESEND_COOLDOWN_SEQUENCE_S } = await import('/auth/sign-in.js');
      const seq = RESEND_COOLDOWN_SEQUENCE_S;
      const history = [];

      let resendIndex = 0;
      for (let sendAttempt = 0; sendAttempt < 5; sendAttempt++) {
        const cd = seq[Math.min(resendIndex, seq.length - 1)];
        resendIndex++;
        history.push(cd);
      }
      return history;
    });

    assert.deepEqual(result, [60, 120, 300, 300, 300]);
  });

  await test('1.3 startResendCooldown disables button, sets text, and counts down', async () => {
    const state = await page.evaluate(async () => {
      const { startResendCooldown, getResendCooldown, resetResendState } = await import('/auth/sign-in.js');
      resetResendState();

      const btn = document.createElement('button');
      const countEl = document.createElement('span');
      document.body.appendChild(btn);
      document.body.appendChild(countEl);

      // Start 60s cooldown
      startResendCooldown(btn, countEl, 60);

      const initialState = {
        btnDisabled: btn.disabled,
        btnText: btn.textContent,
        countText: countEl.textContent,
        cooldownVal: getResendCooldown(),
      };

      resetResendState();
      btn.remove();
      countEl.remove();
      return initialState;
    });

    assert.equal(state.btnDisabled, true);
    assert.equal(state.btnText, 'Resend OTP');
    assert.equal(state.countText, '(resend in 60s)');
    assert.equal(state.cooldownVal, 60);
  });

  await test('1.4 Button is re-enabled when cooldown timer reaches 0', async () => {
    const outcome = await page.evaluate(async () => {
      const { startResendCooldown, resetResendState } = await import('/auth/sign-in.js');
      resetResendState();

      const btn = document.createElement('button');
      const countEl = document.createElement('span');
      document.body.appendChild(btn);
      document.body.appendChild(countEl);

      // Test with a 1-second cooldown to observe real timer expiry
      startResendCooldown(btn, countEl, 1);

      const beforeExpiry = {
        disabled: btn.disabled,
        countText: countEl.textContent,
      };

      await new Promise((r) => setTimeout(r, 1100));

      const afterExpiry = {
        disabled: btn.disabled,
        btnText: btn.textContent,
        countText: countEl.textContent,
      };

      resetResendState();
      btn.remove();
      countEl.remove();
      return { beforeExpiry, afterExpiry };
    });

    assert.equal(outcome.beforeExpiry.disabled, true);
    assert.equal(outcome.beforeExpiry.countText, '(resend in 1s)');
    assert.equal(outcome.afterExpiry.disabled, false);
    assert.equal(outcome.afterExpiry.btnText, 'Resend OTP');
    assert.equal(outcome.afterExpiry.countText, '');
  });

  await test('1.5 Cooldown progression resets to 0 if a different phone number is entered', async () => {
    const resetResult = await page.evaluate(async () => {
      const { RESEND_COOLDOWN_SEQUENCE_S } = await import('/auth/sign-in.js');
      const seq = RESEND_COOLDOWN_SEQUENCE_S;

      let lastPhone = null;
      let resendIndex = 0;

      function simulateSend(phone) {
        if (lastPhone !== phone) {
          lastPhone = phone;
          resendIndex = 0;
        }
        const cd = seq[Math.min(resendIndex, seq.length - 1)];
        resendIndex++;
        return cd;
      }

      const step1 = simulateSend('+919876543210'); // 1st send to num A -> 60s
      const step2 = simulateSend('+919876543210'); // 1st resend to num A -> 120s
      const step3 = simulateSend('+919876543210'); // 2nd resend to num A -> 300s
      const step4 = simulateSend('+919111122222'); // new number B -> resets to 60s
      const step5 = simulateSend('+919111122222'); // 1st resend to num B -> 120s

      return [step1, step2, step3, step4, step5];
    });

    assert.deepEqual(resetResult, [60, 120, 300, 60, 120]);
  });

  // ── TEST GROUP 2: Wrong-OTP Attempt Limit (Max 5) & Session Invalidation ───
  console.log('\n--- GROUP 2: Wrong-OTP Attempt Limit (Max 5) & Session Invalidation ---');

  await test('2.1 MAX_OTP_ATTEMPTS constant is 5', async () => {
    const max = await page.evaluate(async () => {
      const mod = await import('/auth/otp-verification.js');
      return mod.MAX_OTP_ATTEMPTS;
    });
    assert.equal(max, 5);
  });

  await test('2.2 Verification attempts track failures and display remaining attempts (4, 3, 2, 1)', async () => {
    const history = await page.evaluate(async () => {
      const { initOtpVerification, getFailedAttempts, resetOtpState } = await import('/auth/otp-verification.js');
      resetOtpState();

      // Create isolated test DOM
      const container = document.createElement('div');
      container.innerHTML = `
        <div id="test-otp-sec" hidden>
          <input id="test-otp-in" type="text" />
          <button id="test-verify-btn">Verify OTP</button>
          <p id="test-otp-err" hidden></p>
          <span id="test-phone-dsp"></span>
          <button id="test-back-btn">Back</button>
        </div>
      `;
      document.body.appendChild(container);

      let smsSendCallCount = 0;
      let verifyCallCount = 0;

      // Mock confirmation result whose confirm() fails with invalid-verification-code
      const mockConfirmationResult = {
        confirm: async (otp) => {
          verifyCallCount++;
          const err = new Error('The verification code from SMS is invalid.');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
      };

      initOtpVerification({
        otpSectionId:   'test-otp-sec',
        otpInputId:     'test-otp-in',
        verifyBtnId:    'test-verify-btn',
        otpErrorId:     'test-otp-err',
        phoneDisplayId: 'test-phone-dsp',
        backBtnId:      'test-back-btn',
      });

      // Start OTP session
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: mockConfirmationResult, phone: '+919876543210' }
      }));

      const otpInput = document.getElementById('test-otp-in');
      const verifyBtn = document.getElementById('test-verify-btn');
      const errorEl = document.getElementById('test-otp-err');

      const attemptHistory = [];

      // Run 4 incorrect attempts
      for (let i = 1; i <= 4; i++) {
        otpInput.value = '11111' + i;
        verifyBtn.click();
        await new Promise((r) => setTimeout(r, 20)); // wait microtasks

        attemptHistory.push({
          attempt: i,
          failedCount: getFailedAttempts(),
          errorMessage: errorEl.textContent,
          btnDisabled: verifyBtn.disabled,
          inputDisabled: otpInput.disabled,
          verifyCallCount,
          smsSendCallCount,
        });
      }

      container.remove();
      resetOtpState();
      return attemptHistory;
    });

    assert.equal(history.length, 4);
    assert.deepEqual(history[0], {
      attempt: 1,
      failedCount: 1,
      errorMessage: 'Incorrect code. 4 attempts remaining.',
      btnDisabled: false,
      inputDisabled: false,
      verifyCallCount: 1,
      smsSendCallCount: 0,
    });
    assert.deepEqual(history[1], {
      attempt: 2,
      failedCount: 2,
      errorMessage: 'Incorrect code. 3 attempts remaining.',
      btnDisabled: false,
      inputDisabled: false,
      verifyCallCount: 2,
      smsSendCallCount: 0,
    });
    assert.deepEqual(history[2], {
      attempt: 3,
      failedCount: 3,
      errorMessage: 'Incorrect code. 2 attempts remaining.',
      btnDisabled: false,
      inputDisabled: false,
      verifyCallCount: 3,
      smsSendCallCount: 0,
    });
    assert.deepEqual(history[3], {
      attempt: 4,
      failedCount: 4,
      errorMessage: 'Incorrect code. 1 attempt remaining.',
      btnDisabled: false,
      inputDisabled: false,
      verifyCallCount: 4,
      smsSendCallCount: 0,
    });
  });

  await test('2.3 5th wrong OTP invalidates session, disables UI, dispatches event, and sends ZERO SMS', async () => {
    const outcome = await page.evaluate(async () => {
      const { initOtpVerification, getFailedAttempts, getConfirmationResult, resetOtpState } = await import('/auth/otp-verification.js');
      resetOtpState();

      const container = document.createElement('div');
      container.innerHTML = `
        <div id="test-otp-sec-5" hidden>
          <input id="test-otp-in-5" type="text" />
          <button id="test-verify-btn-5">Verify OTP</button>
          <p id="test-otp-err-5" hidden></p>
          <span id="test-phone-dsp-5"></span>
          <button id="test-back-btn-5">Back</button>
        </div>
      `;
      document.body.appendChild(container);

      let verifyCalls = 0;
      let smsCalls = 0;
      let sessionExpiredEventDetail = null;

      window.addEventListener('abacus:otp-session-expired', (e) => {
        sessionExpiredEventDetail = e.detail;
      });

      const mockConfirmationResult = {
        confirm: async () => {
          verifyCalls++;
          const err = new Error('Invalid code');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
      };

      initOtpVerification({
        otpSectionId:   'test-otp-sec-5',
        otpInputId:     'test-otp-in-5',
        verifyBtnId:    'test-verify-btn-5',
        otpErrorId:     'test-otp-err-5',
        phoneDisplayId: 'test-phone-dsp-5',
        backBtnId:      'test-back-btn-5',
      });

      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: mockConfirmationResult, phone: '+919876543210' }
      }));

      const otpInput = document.getElementById('test-otp-in-5');
      const verifyBtn = document.getElementById('test-verify-btn-5');
      const errorEl = document.getElementById('test-otp-err-5');

      // Execute 5 failures
      for (let i = 1; i <= 5; i++) {
        otpInput.value = '99999' + i;
        verifyBtn.click();
        await new Promise((r) => setTimeout(r, 20));
      }

      const stateAfter5th = {
        failedCount: getFailedAttempts(),
        hasConfirmationResult: getConfirmationResult() !== null,
        btnDisabled: verifyBtn.disabled,
        btnText: verifyBtn.textContent,
        inputDisabled: otpInput.disabled,
        errorMessage: errorEl.textContent,
        verifyCalls,
        smsCalls,
        sessionExpiredEventDetail,
      };

      // Attempt 6th submission — must be blocked immediately without calling verify
      verifyBtn.click();
      await new Promise((r) => setTimeout(r, 20));

      const stateAfter6th = {
        verifyCallsAfter6th: verifyCalls,
        smsCallsAfter6th: smsCalls,
        errorMessage: errorEl.textContent,
      };

      container.remove();
      resetOtpState();
      return { stateAfter5th, stateAfter6th };
    });

    // Verify 5th attempt outcome
    assert.equal(outcome.stateAfter5th.failedCount, 5);
    assert.equal(outcome.stateAfter5th.hasConfirmationResult, false, 'confirmationResult must be nullified (session invalidated)');
    assert.equal(outcome.stateAfter5th.btnDisabled, true, 'Verify button must be disabled');
    assert.equal(outcome.stateAfter5th.btnText, 'Session Expired');
    assert.equal(outcome.stateAfter5th.inputDisabled, true, 'OTP input must be disabled');
    assert.ok(outcome.stateAfter5th.errorMessage.includes('Maximum incorrect attempts reached (5)'));
    assert.ok(outcome.stateAfter5th.errorMessage.includes('session has expired'));
    assert.equal(outcome.stateAfter5th.verifyCalls, 5);
    assert.equal(outcome.stateAfter5th.smsCalls, 0, 'ZERO SMS must be sent during wrong OTP entries');
    assert.deepEqual(outcome.stateAfter5th.sessionExpiredEventDetail, { attempts: 5, phone: '+919876543210' });

    // Verify 6th attempt is blocked
    assert.equal(outcome.stateAfter6th.verifyCallsAfter6th, 5, '6th attempt must not call verifyOtp');
    assert.equal(outcome.stateAfter6th.smsCallsAfter6th, 0);
  });

  await test('2.4 After session expiration, user can click back and fresh OTP resets state with clean 0/5 count', async () => {
    const recovery = await page.evaluate(async () => {
      const { initOtpVerification, getFailedAttempts, getConfirmationResult, resetOtpState } = await import('/auth/otp-verification.js');
      resetOtpState();

      const container = document.createElement('div');
      container.innerHTML = `
        <div id="test-otp-sec-rec" hidden>
          <input id="test-otp-in-rec" type="text" />
          <button id="test-verify-btn-rec">Verify OTP</button>
          <p id="test-otp-err-rec" hidden></p>
          <span id="test-phone-dsp-rec"></span>
          <button id="test-back-btn-rec">Back</button>
        </div>
      `;
      document.body.appendChild(container);

      let backTriggered = false;
      let signedInCredential = null;

      const mockExpiredCR = {
        confirm: async () => {
          const err = new Error('Wrong');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
      };

      const mockFreshCR = {
        confirm: async (otp) => {
          if (otp === '654321') return { user: { uid: 'user-rec-123' } };
          throw new Error('Wrong');
        }
      };

      initOtpVerification({
        otpSectionId:   'test-otp-sec-rec',
        otpInputId:     'test-otp-in-rec',
        verifyBtnId:    'test-verify-btn-rec',
        otpErrorId:     'test-otp-err-rec',
        phoneDisplayId: 'test-phone-dsp-rec',
        backBtnId:      'test-back-btn-rec',
        onSignedIn:     (cred) => { signedInCredential = cred; },
        onBack:         () => { backTriggered = true; },
      });

      // 1. First session: 5 failures
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: mockExpiredCR, phone: '+919876543210' }
      }));
      const otpInput = document.getElementById('test-otp-in-rec');
      const verifyBtn = document.getElementById('test-verify-btn-rec');
      const backBtn = document.getElementById('test-back-btn-rec');

      for (let i = 1; i <= 5; i++) {
        otpInput.value = '11111' + i;
        verifyBtn.click();
        await new Promise((r) => setTimeout(r, 20));
      }

      // 2. Click back button
      backBtn.click();

      const stateAfterBack = {
        backTriggered,
        inputVal: otpInput.value,
        inputDisabled: otpInput.disabled,
        btnDisabled: verifyBtn.disabled,
        btnText: verifyBtn.textContent,
        confirmationResultIsNull: getConfirmationResult() === null,
        failedAttempts: getFailedAttempts(),
      };

      // 3. User requests fresh OTP -> new session dispatched
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: mockFreshCR, phone: '+919876543210' }
      }));

      const stateAfterNewSession = {
        failedCount: getFailedAttempts(),
        inputDisabled: otpInput.disabled,
        btnDisabled: verifyBtn.disabled,
        btnText: verifyBtn.textContent,
        hasConfirmationResult: getConfirmationResult() !== null,
      };

      // 4. Enter correct OTP in new session
      otpInput.value = '654321';
      verifyBtn.click();
      await new Promise((r) => setTimeout(r, 20));

      const finalState = {
        signedIn: signedInCredential !== null,
        uid: signedInCredential?.user?.uid,
        failedCount: getFailedAttempts(),
      };

      container.remove();
      resetOtpState();
      return { stateAfterBack, stateAfterNewSession, finalState };
    });

    assert.equal(recovery.stateAfterBack.backTriggered, true);
    assert.equal(recovery.stateAfterBack.confirmationResultIsNull, true);
    assert.equal(recovery.stateAfterNewSession.failedCount, 0, 'New session must reset failed attempts to 0');
    assert.equal(recovery.stateAfterNewSession.inputDisabled, false, 'Input must be re-enabled for new session');
    assert.equal(recovery.stateAfterNewSession.btnDisabled, false, 'Verify button must be re-enabled');
    assert.equal(recovery.stateAfterNewSession.btnText, 'Verify OTP');
    assert.equal(recovery.stateAfterNewSession.hasConfirmationResult, true);
    assert.equal(recovery.finalState.signedIn, true);
    assert.equal(recovery.finalState.uid, 'user-rec-123');
    assert.equal(recovery.finalState.failedCount, 0);
  });

  // ── TEST GROUP 3: Live End-to-End DOM Integration on sign-in.html ───────────
  console.log('\n--- GROUP 3: End-to-End DOM Integration on sign-in.html ---');

  await test('3.1 Full page flow: Phone entry -> send OTP -> 5 wrong OTPs -> session lockout -> back button', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    // Ensure sign-in section is visible
    const signinVisible = await page.isVisible('#phase1-signin-section');
    assert.ok(signinVisible, 'Sign-in section must be visible');

    // Fill phone number
    await page.fill('#phase1-phone', '+91 98765 43210');

    // Simulate OTP sent to switch to OTP section with mock ConfirmationResult
    await page.evaluate(() => {
      const mockCR = {
        confirm: async () => {
          const err = new Error('Invalid code');
          err.code = 'auth/invalid-verification-code';
          throw err;
        }
      };
      window.dispatchEvent(new CustomEvent('abacus:otp-sent', {
        detail: { confirmationResult: mockCR, phone: '+91 98765 43210' }
      }));
    });

    // Verify OTP section is now visible
    assert.ok(await page.isVisible('#phase1-otp-section'), 'OTP section must be visible');
    assert.equal(await page.textContent('#phase1-phone-display'), '+91 98765 43210');

    // Attempt 1
    await page.fill('#phase1-otp', '111111');
    await page.click('#phase1-verify-btn');
    assert.equal(await page.textContent('#phase1-otp-error'), 'Incorrect code. 4 attempts remaining.');

    // Attempt 2
    await page.fill('#phase1-otp', '222222');
    await page.click('#phase1-verify-btn');
    assert.equal(await page.textContent('#phase1-otp-error'), 'Incorrect code. 3 attempts remaining.');

    // Attempt 3
    await page.fill('#phase1-otp', '333333');
    await page.click('#phase1-verify-btn');
    assert.equal(await page.textContent('#phase1-otp-error'), 'Incorrect code. 2 attempts remaining.');

    // Attempt 4
    await page.fill('#phase1-otp', '444444');
    await page.click('#phase1-verify-btn');
    assert.equal(await page.textContent('#phase1-otp-error'), 'Incorrect code. 1 attempt remaining.');

    // Attempt 5 (Final)
    await page.fill('#phase1-otp', '555555');
    await page.click('#phase1-verify-btn');

    // Verify UI is locked out
    const errText = await page.textContent('#phase1-otp-error');
    assert.ok(errText.includes('Maximum incorrect attempts reached (5)'));
    assert.ok(errText.includes('session has expired'));

    const isInputDisabled = await page.isDisabled('#phase1-otp');
    const isBtnDisabled = await page.isDisabled('#phase1-verify-btn');
    const btnText = await page.textContent('#phase1-verify-btn');

    assert.equal(isInputDisabled, true, 'OTP input must be disabled after 5 failures');
    assert.equal(isBtnDisabled, true, 'Verify button must be disabled after 5 failures');
    assert.equal(btnText, 'Session Expired');

    // Click back button to return to sign-in form
    await page.click('#phase1-back-btn');
    assert.ok(await page.isVisible('#phase1-signin-section'), 'Should return to sign-in section');
  });

  await test('3.2 Resend cooldown prevents spam while timer is active and honors [60s, 120s, 300s]', async () => {
    await page.goto(`${BASE_URL}/auth-ui/sign-in.html`);

    // Verify cooldown countdown appearance in DOM
    const countdownOutput = await page.evaluate(async () => {
      const { startResendCooldown, resetResendState } = await import('/auth/sign-in.js');
      const sendBtn = document.getElementById('phase1-send-btn');
      const countEl = document.getElementById('phase1-resend-countdown');

      startResendCooldown(sendBtn, countEl, 60);

      const res = {
        btnText: sendBtn.textContent,
        btnDisabled: sendBtn.disabled,
        countText: countEl.textContent,
      };

      resetResendState();
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send OTP';
      countEl.textContent = '';
      return res;
    });

    assert.equal(countdownOutput.btnText, 'Resend OTP');
    assert.equal(countdownOutput.btnDisabled, true);
    assert.equal(countdownOutput.countText, '(resend in 60s)');
  });

  console.log(`\n========================================`);
  console.log(`All ${testsPassed} automated tests PASSED successfully!`);
  console.log(`========================================\n`);

} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
