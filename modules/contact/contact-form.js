/**
 * AARUTHRUN PORTFOLIO — CONTACT FORM
 * Client-side validation and accessible submission feedback for the contact
 * endpoint (worker/contact-api.js, which delivers through Resend). The
 * endpoint is the only delivery path; no success state is shown unless it
 * explicitly accepts the submission. If it fails, the failure state offers a
 * mailto link with the same message pre-populated.
 */

const ContactForm = (function () {
  'use strict';

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MINIMUM_MESSAGE_LENGTH = 20;

  function init() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const config = typeof AppConfig !== 'undefined' && typeof AppConfig.getContact === 'function'
      ? AppConfig.getContact()
      : {};

    const endpoint = config.formEndpoint || form.getAttribute('action');
    const submitButton = document.getElementById('contact-submit');
    const submitLabel = document.getElementById('contact-submit-label');
    const status = document.getElementById('contact-form-status');
    const success = document.getElementById('contact-success');
    const successTitle = document.getElementById('contact-success-title');
    const resetButton = document.getElementById('contact-reset');
    const sourceUrl = document.getElementById('contact-source-url');

    if (!endpoint || !submitButton || !submitLabel || !status || !success || !successTitle) return;

    if (sourceUrl && /^https?:$/.test(window.location.protocol)) {
      sourceUrl.value = window.location.href;
    }

    let startedAt = Date.now();
    let isSubmitting = false;

    const fields = [
      {
        input: document.getElementById('contact-name'),
        error: document.getElementById('contact-name-error'),
        validate: function (value) {
          if (!value) return 'Enter your name.';
          if (value.length < 2) return 'Enter at least two characters.';
          return '';
        },
      },
      {
        input: document.getElementById('contact-email'),
        error: document.getElementById('contact-email-error'),
        validate: function (value) {
          if (!value) return 'Enter your email address.';
          if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
          return '';
        },
      },
      {
        input: document.getElementById('contact-organization'),
        error: document.getElementById('contact-organization-error'),
        validate: function () {
          return '';
        },
      },
      {
        input: document.getElementById('contact-subject'),
        error: document.getElementById('contact-subject-error'),
        validate: function (value) {
          if (!value) return 'Add a subject.';
          if (value.length < 3) return 'Use at least three characters.';
          return '';
        },
      },
      {
        input: document.getElementById('contact-category'),
        error: document.getElementById('contact-category-error'),
        validate: function (value) {
          return value ? '' : 'Choose the purpose of your enquiry.';
        },
      },
      {
        input: document.getElementById('contact-message'),
        error: document.getElementById('contact-message-error'),
        validate: function (value) {
          if (!value) return 'Add a message.';
          if (value.length < MINIMUM_MESSAGE_LENGTH) {
            return 'Add at least ' + MINIMUM_MESSAGE_LENGTH + ' characters of context.';
          }
          return '';
        },
      },
    ].filter(function (field) {
      return field.input && field.error;
    });

    function setFieldError(field, message) {
      const wrapper = field.input.closest('.contact-field');
      field.error.textContent = message;
      field.error.hidden = !message;
      field.input.setAttribute('aria-invalid', message ? 'true' : 'false');

      if (wrapper) {
        wrapper.classList.toggle('has-error', Boolean(message));
      }
    }

    function clearFieldError(field) {
      setFieldError(field, '');
    }

    function clearAllErrors() {
      fields.forEach(clearFieldError);
    }

    function hideStatus() {
      status.hidden = true;
      status.textContent = '';
      status.classList.remove('is-error');
    }

    function showStatus(message, isError) {
      status.textContent = message;
      status.classList.toggle('is-error', Boolean(isError));
      status.hidden = false;
    }

    function validateFields() {
      let firstInvalid = null;

      fields.forEach(function (field) {
        const value = field.input.value.trim();
        const message = field.validate(value);
        setFieldError(field, message);

        if (message && !firstInvalid) {
          firstInvalid = field.input;
        }
      });

      return firstInvalid;
    }

    function setSubmitting(value) {
      isSubmitting = value;
      submitButton.disabled = value;
      form.setAttribute('aria-busy', value ? 'true' : 'false');
      submitLabel.textContent = value ? 'Sending message...' : 'Send message';
    }

    function showSuccess() {
      form.hidden = true;
      success.hidden = false;
      hideStatus();
      successTitle.focus({ preventScroll: true });
    }

    function resetForm() {
      form.reset();
      clearAllErrors();
      hideStatus();
      form.hidden = false;
      success.hidden = true;
      setSubmitting(false);
      startedAt = Date.now();

      const firstInput = document.getElementById('contact-name');
      if (firstInput) firstInput.focus({ preventScroll: true });
    }

    function buildPayload() {
      const payload = {};

      new FormData(form).forEach(function (value, key) {
        payload[key] = typeof value === 'string' ? value.trim() : value;
      });

      if (/^https?:$/.test(window.location.protocol)) {
        payload._url = window.location.href;
      }

      return payload;
    }

    fields.forEach(function (field) {
      const eventName = field.input.tagName === 'SELECT' ? 'change' : 'input';
      field.input.addEventListener(eventName, function () {
        clearFieldError(field);
        if (!status.hidden && status.classList.contains('is-error')) {
          hideStatus();
        }
      });
    });

    if (resetButton) {
      resetButton.addEventListener('click', resetForm);
    }

    // The form data is kept in the message so the visitor can send the same
    // note from their own mail client when the endpoint refuses it. Opening
    // the mail client automatically is not reliable (pop-up blocking, no
    // handler registered), so the failure state offers a link instead.
    function mailtoHref(payload) {
      const params = new URLSearchParams({
        subject: 'Portfolio enquiry — ' + (payload.category || 'General'),
        body: [
          payload.message || '',
          '',
          '— ' + (payload.name || ''),
          payload.organization || '',
          payload.email || ''
        ].filter(Boolean).join('\n')
      });

      return 'mailto:aaruthrun@gmail.com?' + params.toString();
    }

    function showFailure(message, payload) {
      status.textContent = message + ' ';
      const link = document.createElement('a');
      link.href = mailtoHref(payload);
      link.textContent = 'Open the same message in your email app';
      status.appendChild(link);
      status.appendChild(document.createTextNode('.'));
      status.classList.add('is-error');
      status.hidden = false;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (isSubmitting) return;

      const honeypot = form.querySelector('[name="_honey"]');
      if (honeypot && honeypot.value.trim()) {
        showStatus('The message could not be sent. Please email aaruthrun@gmail.com directly.', true);
        return;
      }

      if (Date.now() - startedAt < (config.minimumSubmitTimeMs || 2500)) {
        showStatus('Please take a moment to review your message, then try again.', true);
        return;
      }

      const firstInvalid = validateFields();
      if (firstInvalid) {
        showStatus('Check the highlighted fields and try again.', true);
        firstInvalid.focus({ preventScroll: true });
        return;
      }

      hideStatus();
      setSubmitting(true);

      const payload = buildPayload();
      const controller = new AbortController();
      const timeout = window.setTimeout(function () {
        controller.abort();
      }, 20000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        let data = null;
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }

        if (!response.ok || !data || String(data.success) !== 'true') {
          const error = new Error('The form endpoint did not accept the message.');
          // The endpoint says why in words ("Enter a valid email address",
          // "domain is not verified"); repeating that is the only way the
          // visitor — or the site owner — can act on it.
          if (data && data.message) error.providerMessage = String(data.message);
          throw error;
        }

        form.reset();
        clearAllErrors();
        showSuccess();
      } catch (error) {
        const isTimeout = error && error.name === 'AbortError';
        const reason = error && error.providerMessage;
        showFailure(
          isTimeout
            ? 'The request timed out, so the message was not sent.'
            : reason
              ? 'The message could not be sent: ' + reason
              : 'The message could not be sent.',
          payload
        );
        console.warn('[ContactForm] Submission failed:', error);
      } finally {
        window.clearTimeout(timeout);
        setSubmitting(false);
      }
    });
  }

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  return { init: init };
})();