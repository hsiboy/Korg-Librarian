# KORG M1 MIDI IMPLEMENTATION

> [!NOTE]
> This information was taken from the PDF of the scanned manual that is aviable on line. There maybe errors due to OCR.

## 1. TRANSMITTED DATA

### 1-1 CHANNEL MESSAGES

| Status | Second | Third | Description | EMA |
|--------|---------|---------|--------------|-----|
| `1000 nnnn` | `0kkk kkkk` | `0100 0000` | Note Off <br> kkk kkkk=24\~108 (61key + Transpose) | A |
| `1001 nnnn` | `0kkk kkkk` | `0vvv vvvv` | Note On <br> kkk kkkk=24\~108 (61key + Transpose) <br> vvv vvvv=1\~127 | A |
| `1011 nnnn` | `0000 0001` | `0vvv vvvv` | Pitch Modulation (Joy Stick(+Y)) | C |
| `1011 nnnn` | `0000 0010` | `0vvv vvvv` | VDF Modulation (Joy Stick(-Y)) | C |
| `1011 nnnn` | `0000 0110` | `0vvv vvvv` | Data Entry (MSB) (E.Slider.A.Pedal) #1 | E |
| `1011 nnnn` | `0000 0111` | `0vvv vvvv` | Volume (Assignable Pedal) | C |
| `1011 nnnn` | `0010 0110` | `0vvv vvvv` | Data Entry (LSB) (E.Slider.A.Pedal) #1 | E |
| `1011 nnnn` | `0100 0000` | `0000 0000` | Damper Off (Damper Pedal) | C |
| `1011 nnnn` | `0100 0000` | `0111 1111` | Damper On (Damper Pedal) | C |
| `1011 nnnn` | `0110 0000` | `0000 0000` | Data Increment (UP Switch) #1 | E |
| `1011 nnnn` | `0110 0001` | `0000 0000` | Data Decrement (DOWN Switch) #1 | E |
| `1011 nnnn` | `0ccc cccc` | `0vvv vvvv` | Control Data (Seq.Recorded Data) #3<br>ccc cccc=00\~101 | Q |
| `1100 nnnn` | `0ppp pppp` | `---- ----` | Program Change (Program or Combi) #2 | P |
| `1101 nnnn` | `0vvv vvvv` | `---- ----` | Channel Pressure (After Touch) | C |
| `1110 nnnn` | `0bbb bbbb` | `0bbb bbbb` | Bender Change (Joy Stick(X)) #3 | C |

nnnn : MIDI Channel No.(0~15) Usually Global Channel. When using Sequencer, each track's channel.

**EMA**:
- A : Always Enable
- C : Enable when Control is On
- P : Enable when Program is On
- E : Enable when Exclusive is On
- Q : Enable only when Sequencer is Playing(T),Recording(R)

**Notes**:
> 1 : Prog, E.Prog, Combi and E.Combi Mode Only<br>
> 2 : When Memory Allocation = L.Prog ····· ppp pppp=0\~99<br>
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;When Memory Allocation = L.Seq. ····· ppp pppp=0\~49<br>
> 3 : Only Seq.Recorded Data use all c=0\~101 area<br>

### 1-2 SYSTEM COMMON MESSAGES

| Status | Second | Third | Description |
|--------|---------|---------|--------------|
| `1111 0010` | `0111 1111` | `0hhh hhhh` | Song Position Pointer<br>111 1111 : Least significant<br>hhh hhhh : Most significant |
| `1111 0011` | `000s ssss` | `---- ----` | Song Select<br>s ssss : Song No. = 0\~19 (10\~19:Card) |

*Transmits when in Sequencer Mode (Internal Clock)*

### 1-3 SYSTEM REALTIME MESSAGES

| Status | Description |
|--------|-------------|
| `1111 1000` | Timing Clock #4 |
| `1111 1010` | Start #4 |
| `1111 1011` | Continue #4 |
| `1111 1100` | Stop #4 |
| `1111 1110` | Active Sensing |

#4 : Transmits when in Sequencer Mode (Internal Clock)

### 1-4 UNIVERSAL SYSTEM EXCLUSIVE MESSAGE (DEVICE INQUIRY)

| Byte (Hex) | Description |
|------------|-------------|
| `1111 0000 (F0)` | EXCLUSIVE STATUS |
| `0111 1110 (7E)` | NON REALTIME MESSAGE |
| `0000 #### (0#)` | MIDI GLOBAL CHANNEL (DEVICE ID) |
| `0000 0110 (06)` | INQUIRY MESSAGE |
| `0000 0010 (02)` | IDENTITY REPLY |
| `0100 0010 (42)` | KORG ID (MANUFACTURERS ID) |
| `0001 1001 (19)` | M1 ID (FAMILY CODE(LSB)) |
| `0000 0000 (00)` | ( - - (MSB)) |
| `0000 0000 (00)` | (MEMBER CODE(LSB)) |
| `0000 0000 (00)` | ( - - (MSB)) |
| `0### #### (##)` | ROM No. 1\~ (Minor Ver.(LSB)) |
| `0000 0000 (00)` | ( - - (MSB)) |
| `0### #### (##)` | SOFT VER. 1\~ (Major Ver.(LSB)) |
| `0000 0000 (00)` | ( - - (MSB)) |
| `1111 0111 (F7)` | END OF EXCLUSIVE |

*Transmits when INQUIRY MESSAGE REQUEST Received*

### 1-5 SYSTEM EXCLUSIVE MESSAGES
#### #1 SYSTEM EXCLUSIVE

| | Description |
|--|------------|
| 1st Byte = 1111 0000 (F0) : Exclusive Status |
| 2nd Byte = 0100 0010 (42) : KORG ID |
| 3rd Byte = 0011 nnnn (3n) : Format ID n:Global ch. |
| 4th Byte = 0001 1001 (19) : M1 ID |
| 5th Byte = 0fff ffff (ff) : Function Code |
| 6th Byte + 0ddd dddd (dd) : Data |
| LastByte = 1111 0111 (F7) : End of Exclusive ······ EOX |

#### Function Code List
| Func | Description | R | C | D | E | Transmit when |
|------|-------------|---|---|---|---|---------------|
| 42 | MODE DATA | ○ | | | | R : Request Message is received |
| 47 | ALL DRUM SOUND(PCM CARD) NAME | ○ | | | | C : Mode or No. is changed by SW |
| 45 | ALL MULTISOUND(PCM CARD) NAME | ○ | | | | D : Data dump by SW |
| 4E | MODE CHANGE | | ○ | | | (Doesn't respond to |
| 41 | PARAMETER CHANGE | | ○ | | | Exclusive On, Off) |
| 40 | PROGRAM PARAMETER DUMP | ○ | ○ | | | E : EX. Message is received |
| 4C | ALL PROGRAM PARAMETER DUMP | ○ | | ○ | |
| 49 | COMBINATION PARAMETER DUMP | ○ | ○ | ○ | |
| 4D | ALL COMBINATION PARAMETER DUMP | ○ | | | ○ |
| 48 | ALL SEQUENCE DATA DUMP | ○ | | | ○ |
| 51 | GLOBAL DATA DUMP | ○ | | | ○ |
| 50 | ALL DATA(GLB.CMB.PRG.SEQ) DUMP | ○ | | | ○ |
| 26 | RECEIVED MESSAGE FORMAT ERROR | | | | ○ |
| 23 | DATA LOAD COMPLETED | | | | ○ |
| 24 | DATA LOAD ERROR | | | | ○ |
| 21 | WRITE COMPLETED | | | | ○ |
| 22 | WRITE ERROR | | | | ○ |

---

# 2. RECOGNIZED RECEIVE DATA

## 2-1 CHANNEL MESSAGES

| Status | Second | Third | Description | EMA |
|--------|---------|---------|--------------|-----|
| 1000 nnnn | 0kkk kkkk | 0xxx xxxx | Note Off | A |
| 1001 nnnn | 0kkk kkkk | 0000 0000 | Note Off | A |
| 1001 nnnn | 0kkk kkkk | 0vvv vvvv | Note On<br>vvv vvvv=1-127 | A |
| 1011 nnnn | 0000 0001 | 0vvv vvvv | Pitch Modulation | C |
| 1011 nnnn | 0000 0010 | 0vvv vvvv | VDF Modulation | C |
| 1011 nnnn | 0000 0110 | 0vvv vvvv | Data Entry (MSB) #1,3 | E |
| 1011 nnnn | 0000 0111 | 0vvv vvvv | Volume | C |
| 1011 nnnn | 0010 0110 | 0vvv vvvv | Data Entry (LSB) #1,3 | E |
| 1011 nnnn | 0100 0000 | 00xx xxxx | Damper Off | C |
| 1011 nnnn | 0100 0000 | 01xx xxxx | Damper On | C |
| 1011 nnnn | 0110 0000 | 0000 0000 | DATA Increment #1,3 | E |
| 1011 nnnn | 0110 0001 | 0000 0000 | DATA Decrement #1,3 | E |
| 1011 nnnn | 0110 0100 | 0000 0001 | RPC Parameter No.(LSB) (M.Tune) #3 | E |
| 1011 nnnn | 0110 0101 | 0000 0000 | RPC Parameter No.(MSB) (M.Tune) #3 | E |
| 1011 nnnn | 0ccc cccc | 0vvv vvvv | Control Data (for Seq.Recording)<br>ccc cccc=00~101 | Q |
| 1011 nnnn | 0111 1010 | 0000 0000 | Local Control Off | A |
| 1011 nnnn | 0111 1010 | 0111 1111 | Local Control On | A |
| 1011 nnnn | 0111 1011 | 0000 0000 | All Notes Off | A |
| 1011 nnnn | 0111 110x | 0000 0000 | (All Notes Off) | A |
| 1011 nnnn | 0111 1110 | 000m mmmm | (All Notes Off)<br>m mmmm=0~16 | A |
| 1011 nnnn | 0111 1111 | 0000 0000 | (All Notes Off) | A |
| 1100 nnnn | 0ppp pppp | ---- ---- | Program,CombiPattern Change #2,3 | P |
| 1101 nnnn | 0vvv vvvv | ---- ---- | Channel Pressure (After Touch) | C |
| 1110 nnnn | 0bbb bbbb | 0bbb bbbb | Bender Change | C |

*x : Random*

**EMA: Same as TRANSMITTED DATA**

**Notes**:
- #1 : Prog.E.Prog.Combi.E.Combi Mode Only
- #2 : Memory Alloc.=L.Prog ······Data beyond value of 99 are assigned a new value by subtracting 100.<br>
       ex. 100→00, 127→27<br>
       Memory Alloc.=L.Seq. ······Data beyond value of 49 are assigned a new value by subtracting 50,<br>
       until the value is less than 50.    ex. 50→00, 127→27
- #3 : After Processing (While Exclusive On).<br>
       Transmits Exclusive Message[DATA LOAD COMPLETED/DATA LOAD ERROR]

## 2-2 SYSTEM COMMON MESSAGES

| Status | Second | Third | Description |
|--------|---------|---------|--------------|
| 1111 0010 | 0111 1111 | 0hhh hhhh | Song Position Pointer<br>111 1111 : Least significant<br>hhh hhhh : Most significant |
| 1111 0011 | 000s ssss | ---- ---- | Song Select<br>s ssss : Song No. = 0~19 (10~19:Card) |

*Receive when in Sequencer Mode (External Clock)*

## 2-3 SYSTEM REALTIME MESSAGES

| Status | Description |
|--------|-------------|
| 1111 1000 | Timing Clock #4 |
| 1111 1010 | Start #4 |
| 1111 1011 | Continue #4 |
| 1111 1100 | Stop #4 |
| 1111 1110 | Active Sensing |

#4 : Receive when in Sequencer Mode (External Clock)

## 2-4 UNIVERSAL SYSTEM EXCLUSIVE MESSAGE (DEVICE INQUIRY)

| Byte | Description |
|------|-------------|
| 1111 0000 (F0) | EXCLUSIVE STATUS |
| 0111 1110 (7E) | NON REALTIME MESSAGE |
| 0### #### (##) | MIDI CHANNEL (DEVICE ID)#5 |
| 0000 0110 (06) | INQUIRY MESSAGE |
| 0000 0001 (01) | INQUIRY REQUEST |
| 1111 0111 (F7) | END OF EXCLUSIVE |

#5 : 0~-F : Receive if Global Channel
    * 7F : Receive any Channel

## 2-5 SYSTEM EXCLUSIVE MESSAGES
\* Not received when Sequencer is playing, recording

### Function Code List

| Func | Description | G | C | P | S | Received when in |
|------|-------------|---|---|---|---|------------------|
| 12 | MODE REQUEST | ○ | ○ | ○ | ○ | G : GLOBAL MODE |
| 1F | ALL DRUM SOUND(PCM CARD) NAME DUMP REQUEST | ○ | ○ | ○ | ○ | (○:Does not respond to |
| 16 | ALL MULTISOUND(PCM CARD) NAME DUMP REQUEST | ○ | ○ | ○ | ○ | Exclusive On,Off in |
| 10 | PROGRAM PARAMETER DUMP REQUEST | | | | | DATA DUMP Page) |
| 1C | ALL PROGRAM PARAMETER DUMP REQUEST | ○ | ○ | ○ | ○ | C : COMBI.& COMBI MODE |
| 19 | COMBINATION PARAMETER DUMP REQUEST | | ○ | | | P : PROG.& PROG MODE |
| 1D | ALL COMBINATION PARAMETER DUMP REQUEST | ○ | ○ | ○ | ○ | S : SEQUENCER MODE |
| 18 | ALL SEQUENCE DATA DUMP REQUEST | ○ | ○ | ○ | ○ |  |
| 05 | GLOBAL DATA DUMP REQUEST | ○ | ○ | ○ | ○ |  |
| 0F | ALL DATA(GLOBAL,COMBI,PROG,SEQ )DUMP REQUEST | ○ | ○ | ○ | ○ |  |
| 11 | PROGRAM WRITE REQUEST | | | ○ | |  |
| 12 | COMBINATION WRITE REQUEST | | ○ | | |  |
| 40 | PROGRAM PARAMETER DUMP | | | ○ | |  |
| 4C | ALL PROGRAM PARAMETER DUMP | ○ | ○ | ○ | ○ |  |
| 49 | COMBINATION PARAMETER DUMP | | ○ | | |  |
| 4D | ALL COMBINATION PARAMETER DUMP | ○ | ○ | ○ | ○ |  |
| 48 | ALL SEQUENCE DATA DUMP | ○ | ○ | ○ | ○ |  |
| 51 | GLOBAL DATA DUMP | ○ | ○ | ○ | ○ |  |
| 50 | ALL DATA(GLOBAL,COMBI,PROG,SEQ ) DUMP | ○ | ○ | ○ | ○ |  |
| 4E | MODE CHANGE | ○ | ○ | ○ | ○ |  |
| 41 | PARAMETER CHANGE | ○ | ○ | ○ | ○ |  |

---

# 3. MIDI EXCLUSIVE FORMAT

R : Receive, T : Transmit

## (1) MODE REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 0010 | MODE REQUEST 12H |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=42 message.*

## (2) PROGRAM PARAMETER DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 0000 | PROGRAM PARAMETER DUMP REQUEST 10H |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=40 message, or transmits Func=24 message.*

## (3) ALL DRUM SOUND(PCM Card) NAME DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1111 | ALL DRUM SOUND(Card) NAME DUMP REQ. 1FH |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=47 message, or transmits Func=24 message.*

## (4) ALL MULTISOUND(PCM Card) NAME DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 0110 | ALL MULTISOUND(Card) NAME DUMP REQ. 16H |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=45 message, or transmits Func=24 message.*

## (5) ALL PROGRAM PARAMETER DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1100 | ALL PROGRAM PARAMETER DUMP REQUEST 1CH |
| 0000 000C | Bank (See NOTE 3-1) |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=4C message, or transmits Func=24 message.*

## (6) COMBINATION PARAMETER DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1001 | COMBINATION PARAMETER DUMP REQUEST 19H |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=49 message, or transmits Func=24 message.*

## (7) ALL COMBINATION PARAMETER DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1101 | ALL COMBI. PARAMETER DUMP REQUEST 1DH |
| 0000 000c | Bank (See NOTE 3-1) |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=4D message, or transmits Func=24 message.*

## (8) ALL SEQUENCE DATA DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1000 | ALL SEQUENCE DATA DUMP REQUEST 18H |
| 0000 000c | Bank (See NOTE 3-1) |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=48 message, or transmits Func=24 message.*

## (9) GLOBAL DATA DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0000 1110 | GLOBAL DATA DUMP REQUEST 02H |
| 0000 000c | Bank (See NOTE 3-1) |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=51 message, or transmits Func=24 message.*

## (10) ALL DATA(GLOBAL,COMBI,PROG,SEQ.) DUMP REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0000 1111 | ALL DATA(GLB.CMB.PRG.SEQ.) DUMP REQ.0FH |
| 0000 000c | Bank (See NOTE 3-1) |
| 1111 0111 | EOX |

*Receives this message, and transmits Func=50 message, or transmits Func=24 message.*

## (11) PROGRAM WRITE REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 0001 | PROGRAM WRITE REQUEST 11H |
| 0000 000c | Bank (See NOTE 3-1) |
| 0ppp pppp | Write Program No.(0-99 or 0-49) |
| 1111 0111 | EOX |

*Receives this message, and writes the data and transmits Func=21 message, or transmits Func=22 message.*

## (12) COMBINATION WRITE REQUEST [R]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0001 1010 | COMBINATION WRITE REQUEST 1AH |
| 0000 000c | Bank (See NOTE 3-1) |
| 0ppp pppp | Write Combination No.(0-99 or 0-49) |
| 1111 0111 | EOX |

*Receives this message, and writes the data and transmits Func=21 message, or transmits Func=22 message.*

## (13) PROGRAM PARAMETER DUMP [R, T]

| Byte | Description |
|------|-------------|
| F0,42,3n,19 | EXCLUSIVE HEADER |
| 0100 0000 | PROGRAM PARAMETER DUMP 40H |
| 0ddd dddd | Data (See NOTE 6) |
| 1111 0111 | EOX |

*Receives this message & data, and transmits Func=23 message, or transmits Func=24 message.*
*Receives Func=10 message, and transmits this message & data.*
*When changing the program no.by SW, transmits this message & data.*

