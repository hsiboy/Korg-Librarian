# Korg M1 MIDI Parameter Tables

# Korg M1 MIDI Implementation

## MIDI Exclusive Format

R = Receive, T = Transmit

### 1. MODE REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 0010     MODE REQUEST    12H
1111 0111     EOX
```
*Receives this message, and transmits Func=42 message.*

### 2. PROGRAM PARAMETER DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 0000     PROGRAM PARAMETER DUMP REQUEST 10H
1111 0111     EOX
```
*Receives this message and transmits Func=40 message or transmits Func=24 message.*

### 3. ALL DRUM SOUND(PCM Card) NAME DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1111     ALL DRUM SOUND(Card) NAME DUMP REQ. 1FH
1111 0111     EOX
```
*Receives this message and transmits Func=47 message or transmits Func=24 message.*

### 4. ALL MULTISOUND(PCM Card) NAME DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 0110     ALL MULTISOUND(Card) NAME DUMP REQ. 16H
1111 0111     EOX
```
*Receives this message and transmits Func=45 message or transmits Func=24 message.*

### 5. ALL PROGRAM PARAMETER DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1100     ALL PROGRAM PARAMETER DUMP REQUEST 1CH
0000 000c     Bank          (See NOTE 3-1)
1111 0111     EOX
```
*Receives this message and transmits Func=4C message or transmits Func=24 message.*

### 6. COMBINATION PARAMETER DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 0001     COMBINATION PARAMETER DUMP REQUEST 19H
1111 0111     EOX
```
*Receives this message and transmits Func=40 message or transmits Func=24 message.*

### 7. ALL COMBINATION PARAMETER DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1101     ALL COMBI. PARAMETER DUMP REQUEST 1DH
0000 000c     Bank          (See NOTE 3-1)
1111 0111     EOX
```
*Receives this message and transmits Func=40 message or transmits Func=24 message.*

### 8. ALL SEQUENCE DATA DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1000     ALL SEQUENCE DATA DUMP REQUEST 18H
0000 000c     Bank          (See NOTE 3-1)
1111 0111     EOX
```
*Receives this message and transmits Func=40 message or transmits Func=24 message.*

### 9. GLOBAL DATA DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1110     GLOBAL DATA DUMP REQUEST     0EH
0000 000c     Bank          (See NOTE 3-1)
1111 0111     EOX
```
*Receives this message and transmits Func=51 message or transmits Func=24 message.*

### 10. ALL DATA(GLOBAL,COMBI,PROG,SEQ.) DUMP REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 1111     ALL DATA(GLB.CMB.PRG.SEQ.) DUMP REQ 0FH
0000 000c     Bank          (See NOTE 3-1)
1111 0111     EOX
```
*Receives this message and transmits Func=50 message or transmits Func=24 message.*

### 11. PROGRAM WRITE REQUEST (R)
```
         Byte         Description
F0,42,3n,19   EXCLUSIVE HEADER
0001 0001     PROGRAM WRITE REQUEST     11H
0000 000c     Bank          (See NOTE 3-1)
0ppp pppp     Write Program No.(0~99 or 0~49)
1111 0111     EOX
```
*Receives this message and writes the data and transmits Func=21 message or transmits Func=22 message.*

### Notes

#### NOTE 1: mm = 0 : COMBINATION  3 : EDIT PROG.
           1 : EDIT COMBI.   4 : GLOBAL
           2 : PROGRAM       6 : SEQUENCER

#### NOTE 2: b  = 0 : Change the Mode,Bank
               1 : Don't change the Mode,Bank

#### NOTE 3-1: c = 0 : Internal
               1 : Card

#### NOTE 3-2: a = 0 : 100Combination & 100Program
               1 : 50         &  50

#### NOTE 4: 11.ma= 0.0 : Card Off
                0.1 : NC Card (ROM)
                0.2 : -  -   (RAM)
          11 = 1: ROM Card      mm = 0: Glb.+100:100
               2: RAM Card(Protect Off)  1: Glb.+ 50: 50(Seq.
               3: -  -  ( -     On )     2: Sequencer

#### NOTE 5: cc = 0 : Card Off
                1 : No Card
                2 : PCM Card in

### Program Parameter Table
[Insert program parameter table here]

### Global Parameter Table
[Insert global parameter table here]

### Sequence Control Data Table
[Insert sequence control data table here]




## Program Parameters (TABLE 1)

| No. | Parameter | DATA(Hex) : Value |
|-----|-----------|------------------|
| 00  | PROGRAM NAME (Head) | 20~7F : ' '~'~' |
| 09  | PROGRAM NAME (Tail) | |
| 10  | OSCILLATOR MODE | 0,1,2 : *2 |
| 11  | ASSIGN | bit0-0:POL. =1:MON<br>HOLD = bit1=0:OFF, =1:ON |
| 12  | OSC-1 MULTISOUND | 00~63:Int.64~:Card |
| 13  | OSC-1 OCTAVE | FF~01 : -1~+1 |
| 14  | OSC-2 MULTISOUND | 00~63:Int.64~:Card |
| 15  | OSC-2 OCTAVE | FF~01 : -1~+1 |
| 16  | INTERVAL | F4~0C : -12~+12 |
| 17  | DETUNE | CE~32 : -50~50 |
| 18  | DELAY START | 00~63 |

### OSC-1 PITCH EG
| No. | Parameter | DATA(Hex) : Value |
|-----|-----------|------------------|
| 63  | START LEVEL | 00~63 |
| 64  | ATTACK TIME | 00~63 |
| 65  | ATTACK LEVEL | BD~63 : -99~99 |
| 66  | DECAY TIME | 00~63 |
| 67  | RELEASE TIME | 00~63 |
| 68  | RELEASE LEVEL | BD~63 : -99~99 |
| 69  | TIME VELOCITY SENSE | BD~63 : -99~99 |
| 70  | LEVEL VELOCITY SENSE | BD~63 : -99~99 |

### VDF-1
| No. | Parameter | DATA(Hex) : Value |
|-----|-----------|------------------|
| 71  | CUTOFF VALUE | 00~63 |
| 72  | KBD TRACK CENTER | 00~7F : C-1~G9 |
| 73  | CUTOFF KBD TRACK | BD~63 : -99~99 |
| 74  | EG INTENSITY | 00~63 |
| 75  | EG TIME VEL SENSE | 00~63 |
| 76  | EG TIME KEY SENSE | 00~63 |
| 77  | EG INT. SENSE | BD~63 : -99~99 |

### VDF-1 EG
| No. | Parameter | DATA(Hex) : Value |
|-----|-----------|------------------|
| 78  | ATTACK TIME | 00~63 |
| 79  | ATTACK LEVEL | BD~63 : -99~99 |
| 80  | DECAY TIME | 00~63 |
| 81  | BREAK POINT | BD~63 : -99~99 |
| 82  | SLOPE TIME | 00~63 |
| 83  | SUSTAIN LEVEL | BD~63 : -99~99 |
| 84  | RELEASE TIME | 00~63 |
| 85  | RELEASE LEVEL | BD~63 : -99~99 |


