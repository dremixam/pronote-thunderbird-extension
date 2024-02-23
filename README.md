# Notification Banner messageDisplayScript example

Brief example on Thunderbirds `messageDisplayScript` API by displaying a notification banner in the message reading pane. The notification banner shows the subject of the currently selected message and offer a button to mark the message as unread. 

The `background.js` script contains the main logic, like wire up the event handlers and perform actions on email messages, while the `message-content-script.js` contains only a function to create the UI elements needed for a simple notification bar.

Once an email message is selected, the `message-content-script.js` is loaded in context of the displayed message, so all public functions within this script are available in context of this message. In order to display the notification bar, we can now call `showNotification` from the background script and pass the current `tabId` as well as the subject line from the currently displayed message to the `showNotification` function.

The button communicates with the background script via `sendMessage` by sending a "message object" of the following structure:

```
{
    command: "markUnread"
}
```
***Hint:** the message can be of any structure which can be [serialized](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#data_cloning_algorithm), there isn't a rule what structure needs to be used.*


The background script receives the message and check for its `command` property, whether the received message has a non-empty `command` property. If so, the entire message is passed to a command handler which takes different actions on the currently selected mail message, based on the passed command. If the command handler returns an object, this object will be passed back to the message content script.

### Differences from the version for manifest v2

The `messageDisplayScripts` API is not yet compatible with manifest v3. Its usage
was replaced by a `messageDisplay.onMessageDisplayed` listener:

```
browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  // Inject styles.
  await browser.tabs.insertCSS(tab.id, {
    file: "/src/message-content-styles.css"
  });
  // Inject script.
  await browser.tabs.executeScript(tab.id, {
    file: "/src/message-content-script.js"
  })
});
```
