// ==UserScript==
// @name         Google Meet Tab Close Confirmation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ask for confirmation before closing Google Meet tab
// @author       Keisuke Kawhara (@ktansai)
// @match        *://meet.google.com/*
// @grant        none
// ==/UserScript==


(function() {
  'use strict';

  window.addEventListener('beforeunload', function (e) {
      // Set confirmation message
      var confirmationMessage = 'Are you sure you want to leave the meeting?';
      e.returnValue = confirmationMessage;     // Standard for most browsers
      return confirmationMessage;              // For some older browsers
  });
})();
