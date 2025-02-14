# Korg M1 SysEx Implementation
## Program and Combination Data Management

### 1. Common Message Format
All SysEx messages begin with the following header:
```
F0 42 3n 19
```
Where:
- F0: SysEx Status
- 42: Korg ID
- 3n: n = Global MIDI Channel (0-F)
- 19: M1 Model ID

All messages end with:
```
F7
```

### 2. Memory Organization
- Internal Memory:
  - 100 Programs (00-99)
  - 100 Combinations (00-99)
- Card Memory:
  - 50 Programs (00-49)
  - 50 Combinations (00-49)

### 3. Program Data Messages

#### 3.1 Program Parameter Dump Request
- Direction: Controller → M1
```
F0 42 3n 19 10 00 F7
```

#### 3.2 Program Parameter Dump
- Direction: M1 → Controller
- Message ID: 40H
```
F0 42 3n 19 40 [Data] F7
```
Data Format:
- Length: 143 bytes per parameter
- Structure: [Parameter No.00]...[Parameter No.142]
- Memory Allocation: 14300 bytes (L-Prog)

#### 3.3 All Program Parameter Dump Request
- Direction: Controller → M1
```
F0 42 3n 19 4C 00 F7
```

#### 3.4 All Program Parameter Dump
- Direction: M1 → Controller
- Message ID: 4CH
```
F0 42 3n 19 4C [Bank] [Data] F7
```
Where:
- Bank: 00 = Internal (100 Programs)
- Bank: 01 = Card (50 Programs)
Data Format:
- Total Length: 143 bytes × number of programs
- Internal: 14300 bytes
- Card: 7150 bytes

### 4. Combination Data Messages

#### 4.1 Combination Parameter Dump Request
- Direction: Controller → M1
```
F0 42 3n 19 48 [Bank] F7
```

#### 4.2 Combination Parameter Dump
- Direction: M1 → Controller
- Message ID: 48H
```
F0 42 3n 19 48 [Bank] [Data] F7
```
Data Format:
- Length: 124 bytes per combination
- Structure: [Parameter No.00]...[Parameter No.123]

#### 4.3 All Combination Parameter Dump Request
- Direction: Controller → M1
```
F0 42 3n 19 49 [Bank] F7
```

#### 4.4 All Combination Parameter Dump
- Direction: M1 → Controller
- Message ID: 49H
```
F0 42 3n 19 49 [Bank] [Data] F7
```
Data Format:
- Internal: 12400 bytes (100 combinations)
- Card: 6200 bytes (50 combinations)

### 5. Parameter Change Messages

#### 5.1 Program Parameter Change
- Direction: Controller → M1
```
F0 42 3n 19 41 [Page] [Position] [Value_LSB] [Value_MSB] F7
```
Where:
- Page: Parameter page number (See TABLE 5.6)
- Position: Parameter position (See TABLE 5.6)
- Value: Split into LSB (bits 0-6) and MSB (bits 15-7)

#### 5.2 Mode Change
- Direction: Controller → M1
```
F0 42 3n 19 4E [Mode] [Bank] F7
```
Where:
- Mode:
  - 0: Combination
  - 1: Edit Combination
  - 2: Program
  - 3: Edit Program
- Bank:
  - 0: Change Mode & Bank
  - 1: Don't change Mode & Bank

### 6. Data Format Details

#### 6.1 Program Parameter Format
Total size: 143 bytes per parameter
```
[Parameter No.00]: Program Name (Head) 20~7F : ' '~'~'
[Parameter No.01-09]: Program Name (Tail)
[Parameter No.10-37]: Oscillator Parameters
[Parameter No.38-62]: Effect Parameters
...
[Parameter No.142]: END
```

#### 6.2 Combination Parameter Format
Total size: 124 bytes per combination
```
[Parameter No.00-99]: Timbre Parameters
[Parameter No.100-123]: Effect and Control Parameters
```

### 7. Status Messages

#### 7.1 Data Load Completed
- Direction: M1 → Controller
```
F0 42 3n 19 23 F7
```

#### 7.2 Data Load Error
- Direction: M1 → Controller
```
F0 42 3n 19 24 F7
```

#### 7.3 Write Completed
- Direction: M1 → Controller
```
F0 42 3n 19 21 F7
```

#### 7.4 Write Error
- Direction: M1 → Controller
```
F0 42 3n 19 22 F7
```

### 8. Memory Protection Notes

1. For internal memory operations:
   - Program write protect and Combination write protect must be OFF
   - Can be set in Global mode

2. For card operations:
   - Physical write protect switch on the card must be OFF
   - Card must be inserted and recognized

### 9. Timing Considerations

1. Program Data Transfer:
   - L-Prog: ~5.25 seconds
   - L-Seq: ~2.85 seconds

2. Combination Data Transfer:
   - L-Prog: ~4.55 seconds
   - L-Seq: ~2.35 seconds

3. Wait for Write Completed message before sending next command
4. Implement timeout handling (recommended 10 second timeout)
