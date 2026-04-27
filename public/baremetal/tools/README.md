# xmodem1k_uploader
Для работы с загрузчиком ex_loader

## Сборка
```
gcc xmodem1k_uploader.c -O2 -s ../libbaremetal/src/libc/crc16_ccit.c -o xmodem1k_uploader
```

## Запуск
```
./xmodem1k_uploader /dev/ttyUSB0 ../ex_tsens/out.bin
```

# ex_uploader
Для работы с загрузчиками ex_loader_2 и ex_loader_3

## Сборка
```
gcc ex_uploader.c -O2 -s -Wall -Wextra -o ex_uploader
```

## Запуск
```
./ex_uploader /dev/ttyUSB0 ../ex_tsens/out.bin
```
