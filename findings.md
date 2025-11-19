### pins layout:
pin 8 // right most
pin 9
pin 7
pin 28
pin 27
pin 23 // was flickering?
pin 22  // left most


strip 5 from left (pin 7) has offset in the first pixel - when sending 

frame indecies:
|  | strip_1 | strip_2 | strip_3 | strip_4 | strip_5 | strip_6 | strip_7 |
|---|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|
| first | 0 | 39 | 78 | 117 | 156 | 195 | 234 |
| last  | 38 | 77 | 116 | 155 | 194 | 233 | 272 |