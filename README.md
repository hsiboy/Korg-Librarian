# Korg M1 Web Librarian

A modern web-based patch librarian for the vintage Korg M1 synthesizer. This tool allows you to backup and restore programs, combinations, and song data directly from your browser using WebMIDI.

## Features

- 🎹 Automatic Korg M1 detection
- 💾 Browser-based storage for patches
- 🌐 Works directly in your browser - no installation needed
- 📱 Responsive design
- 🏭 Preserve factory presets
- 🔌 Support for modern MIDI interfaces

## Live Demo

Visit [https://hsiboy.github.io/Korg-Librarian](https://hsiboy.github.io/Korg-Librarian) to try it out.

## Requirements

### Browser Support

| Browser | WebMIDI Support |
|---------|----------------|
| Chrome  | ✅             |
| Edge    | ✅             |
| Opera   | ✅             |
| Firefox | ❌             |
| Safari  | ❌             |

### Hardware Requirements

- Korg M1 Synthesizer
- MIDI Interface (USB or Bluetooth)

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/hsiboy/Korg-Librarian.git
cd Korg-Librarian
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Technical Details

### MIDI Implementation

The librarian uses System Exclusive (SysEx) messages to communicate with the M1:

```
Device Inquiry:
F0 7E 7F 06 01 F7

Device Response:
F0 7E <device ID> 06 02 mm ff ff dd dd ss ss ss ss F7
Where:
- mm: Manufacturer ID (42h = Korg)
- ff ff: Device family (M1)
- dd dd: Device member code
- ss ss ss ss: Software revision
```

### Storage

Patches are stored in the browser's local storage. You can:
- Backup all programs
- Store individual patches
- Organize by type (Programs/Combinations/Songs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Areas for Contribution

- Enhanced MIDI error handling
- Additional patch banks
- UI improvements
- Documentation improvements
- Testing with different MIDI interfaces

## Known Issues

- Some MIDI interfaces may require specific configuration for SysEx
- Only tested with Chrome/Edge browsers
- Backup process timing may need adjustment for different MIDI interfaces

## Troubleshooting

### No MIDI Devices Detected
- Ensure your MIDI interface is connected before loading the page
- Check system MIDI settings
- Try refreshing the page
- Verify browser WebMIDI support

### Device Not Recognized
- Verify M1 is powered on
- Check MIDI cables/connection
- Ensure M1 is set to receive SysEx messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- The Korg M1 synthesizer was released in 1988
- Thanks to the WebMIDI API team
- Built using React, Vite, and ShadcnUI

## Support

If you encounter any issues:

1. Check the [Issues](https://github.com/hsiboy/Korg-Librarian/issues) page
2. Create a new issue with:
   - Browser and version
   - MIDI interface details
   - Steps to reproduce
   - Expected vs actual behavior

## Roadmap

- [ ] Program data backup/restore
- [ ] Combination data support
- [ ] Enhanced patch organization
- [ ] Patch editing interface
- [ ] Support for multiple MIDI devices

---

Created by [hsiboy](https://github.com/hsiboy)
