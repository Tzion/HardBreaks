import os
import time
import serial
if os.uname().sysname == 'Darwin':
    import pdb; pdb.set_trace()
    port = os.environ.get('PORT', '/dev/tty.usbmodem101')
else:
    port = os.environ.get('PORT', '/dev/ttyACM0')
s = serial.Serial(port, 115200, timeout=2, write_timeout=2)
time.sleep(0.2)  # small settle time
n = s.write(b'\x00\xff\x00' * 5)  # 5 "frames" of 3 bytes each
s.flush()
print("wrote", n, "bytes")
import pdb; pdb.set_trace()
s.close()