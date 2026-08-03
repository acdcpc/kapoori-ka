with open('app.config.js') as f:
    content = f.read()

# Remove the react-native-vision-camera plugin block
# It spans from: ["react-native-vision-camera", to the closing ] and ,
old_block = '''      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Kapoori Ka needs camera access to measure your child's height.",
          "enableMicrophonePermission": false,
          "enableCodeScanner": false
        }
      ],
'''
if old_block in content:
    content = content.replace(old_block, '')
    print("Removed: react-native-vision-camera expo plugin block")
else:
    print("Block not found! Checking...")
    # Try with different whitespace
    start = content.find('"react-native-vision-camera"')
    if start >= 0:
        # Find the surrounding array block
        block_start = content.rfind('[', 0, start)
        # Find the closing ] and comma
        block_end = content.find('],', start)
        if block_end >= 0:
            block_end += 2  # include ],
            line_start = content.rfind('\n', 0, block_start)
            line_end = content.find('\n', block_end)
            print(f"Found vision-camera block from char {line_start+1} to {line_end}")
            print(content[line_start+1:line_end])
            content = content[:line_start+1] + content[line_end:]

with open('app.config.js', 'w') as f:
    f.write(content)

print("\nDONE")
