(function(root) {
  const MessageType = {
    TEXT: { value: "welcome", label: "Welcome" },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageType;
  } else {
    root.MessageType = MessageType;
  }
})(typeof self !== 'undefined' ? self : this);
