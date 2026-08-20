tell application "Google Chrome"
  tell active tab of front window
    return execute "document.title"
  end tell
end tell
