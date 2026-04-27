CFLAGS_DEBUG = -Os -g --freestanding -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -Wall -Wextra
CFLAGS_SIZE = -Os -s -flto -ffat-lto-objects --freestanding -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -Wall -Wextra
CFLAGS_SIZE_WO_LTO = -Os -s --freestanding -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -Wall -Wextra
CFLAGS_SPEED = -Ofast -s -flto -ffat-lto-objects --freestanding -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -Wall -Wextra


all: size
debug: lib/libc.a lib/libm.a
size: lib/libc.a lib/libm.a
speed: lib/libc.a lib/libm.a
size_wo_lto: lib/libc.a lib/libm.a

debug: CFLAGS = $(CFLAGS_DEBUG)
size:  CFLAGS = $(CFLAGS_SIZE)
speed: CFLAGS = $(CFLAGS_SPEED)
size_wo_lto: CFLAGS = $(CFLAGS_SIZE_WO_LTO)

CFLAGS_LIBC = -I./include $(CFLAGS)


lib/libc.a: src/libc/crt0.o \
		src/libc/runtime.o \
		src/libc/gmtime_r.o \
		src/libc/memset.o \
		src/libc/bzero.o \
		src/libc/snprintf.o \
		src/libc/strstr.o \
		src/libc/memmem.o \
		src/libc/memcmp.o \
		src/libc/memchr.o \
		src/libc/strchr.o \
		src/libc/strchrnul.o \
		src/libc/strlen.o \
		src/libc/strnlen.o \
		src/libc/__secs_to_tm.o \
		src/libc/__year_to_secs.o \
		src/libc/__month_to_secs.o \
		src/libc/__tm_to_secs.o \
		src/libc/timegm.o \
		src/libc/strcspn.o \
		src/libc/strsep.o \
		src/libc/strcmp.o \
		src/libc/strncmp.o \
		src/libc/memcpy.o \
		src/libc/picojpeg.o \
		src/libc/log_buffer_hex.o \
		src/libc/blake2s-ref.o \
		src/libc/blake2b-ref.o \
		src/libc/aes_128.o \
		src/libc/crc16_ccit.o \
		src/libc/heap.o \
		src/libc/bsearch.o \
		src/libc/rand.o
	riscv64-unknown-elf-ar cr lib/libc.a \
		src/libc/crt0.o \
		src/libc/runtime.o \
		src/libc/gmtime_r.o \
		src/libc/memset.o \
		src/libc/bzero.o \
		src/libc/snprintf.o \
		src/libc/strstr.o \
		src/libc/memmem.o \
		src/libc/memcmp.o \
		src/libc/memchr.o \
		src/libc/strchr.o \
		src/libc/strchrnul.o \
		src/libc/strlen.o \
		src/libc/strnlen.o \
		src/libc/__secs_to_tm.o \
		src/libc/__year_to_secs.o \
		src/libc/__month_to_secs.o \
		src/libc/__tm_to_secs.o \
		src/libc/timegm.o \
		src/libc/strcspn.o \
		src/libc/strsep.o \
		src/libc/strcmp.o \
		src/libc/strncmp.o \
		src/libc/memcpy.o \
		src/libc/picojpeg.o \
		src/libc/log_buffer_hex.o \
		src/libc/blake2s-ref.o \
		src/libc/blake2b-ref.o \
		src/libc/aes_128.o \
		src/libc/crc16_ccit.o \
		src/libc/heap.o \
		src/libc/bsearch.o \
		src/libc/rand.o
	riscv64-unknown-elf-ranlib lib/libc.a

src/libc/crt0.o: src/libc/crt0.S
	riscv64-unknown-elf-gcc src/libc/crt0.S $(CFLAGS_LIBC) -c -o src/libc/crt0.o

src/libc/runtime.o: src/libc/runtime.c
	riscv64-unknown-elf-gcc src/libc/runtime.c -I../ $(CFLAGS_LIBC) -c -o src/libc/runtime.o

src/libc/gmtime_r.o: src/libc/gmtime_r.c
	riscv64-unknown-elf-gcc src/libc/gmtime_r.c $(CFLAGS_LIBC) -c -o src/libc/gmtime_r.o
	
src/libc/memset.o: src/libc/memset.c
	riscv64-unknown-elf-gcc src/libc/memset.c $(CFLAGS_LIBC) -fno-lto -c -o src/libc/memset.o

src/libc/bzero.o: src/libc/bzero.c
	riscv64-unknown-elf-gcc src/libc/bzero.c $(CFLAGS_LIBC) -c -o src/libc/bzero.o

src/libc/snprintf.o: src/libc/snprintf.c
	riscv64-unknown-elf-gcc src/libc/snprintf.c $(CFLAGS_LIBC) -c -o src/libc/snprintf.o

src/libc/strstr.o: src/libc/strstr.c
	riscv64-unknown-elf-gcc src/libc/strstr.c $(CFLAGS_LIBC) -c -o src/libc/strstr.o

src/libc/memmem.o: src/libc/memmem.c
	riscv64-unknown-elf-gcc src/libc/memmem.c $(CFLAGS_LIBC) -c -o src/libc/memmem.o

src/libc/memcmp.o: src/libc/memcmp.c
	riscv64-unknown-elf-gcc src/libc/memcmp.c $(CFLAGS_LIBC) -c -o src/libc/memcmp.o

src/libc/memchr.o: src/libc/memchr.c
	riscv64-unknown-elf-gcc src/libc/memchr.c $(CFLAGS_LIBC) -c -o src/libc/memchr.o

src/libc/strchr.o: src/libc/strchr.c
	riscv64-unknown-elf-gcc src/libc/strchr.c $(CFLAGS_LIBC) -c -o src/libc/strchr.o

src/libc/strchrnul.o: src/libc/strchrnul.c
	riscv64-unknown-elf-gcc src/libc/strchrnul.c $(CFLAGS_LIBC) -c -o src/libc/strchrnul.o

src/libc/strlen.o: src/libc/strlen.c
	riscv64-unknown-elf-gcc src/libc/strlen.c $(CFLAGS_LIBC) -c -o src/libc/strlen.o

src/libc/strnlen.o: src/libc/strnlen.c
	riscv64-unknown-elf-gcc src/libc/strnlen.c $(CFLAGS_LIBC) -c -o src/libc/strnlen.o

src/libc/__secs_to_tm.o: src/libc/__secs_to_tm.c
	riscv64-unknown-elf-gcc src/libc/__secs_to_tm.c $(CFLAGS_LIBC) -c -o src/libc/__secs_to_tm.o

src/libc/__year_to_secs.o: src/libc/__year_to_secs.c
	riscv64-unknown-elf-gcc src/libc/__year_to_secs.c $(CFLAGS_LIBC) -c -o src/libc/__year_to_secs.o

src/libc/__month_to_secs.o: src/libc/__month_to_secs.c
	riscv64-unknown-elf-gcc src/libc/__month_to_secs.c $(CFLAGS_LIBC) -c -o src/libc/__month_to_secs.o

src/libc/__tm_to_secs.o: src/libc/__tm_to_secs.c
	riscv64-unknown-elf-gcc src/libc/__tm_to_secs.c $(CFLAGS_LIBC) -c -o src/libc/__tm_to_secs.o

src/libc/timegm.o: src/libc/timegm.c
	riscv64-unknown-elf-gcc src/libc/timegm.c $(CFLAGS_LIBC) -c -o src/libc/timegm.o

src/libc/strcspn.o: src/libc/strcspn.c
	riscv64-unknown-elf-gcc src/libc/strcspn.c $(CFLAGS_LIBC) -c -o src/libc/strcspn.o

src/libc/strsep.o: src/libc/strsep.c
	riscv64-unknown-elf-gcc src/libc/strsep.c $(CFLAGS_LIBC) -c -o src/libc/strsep.o

src/libc/strcmp.o: src/libc/strcmp.c
	riscv64-unknown-elf-gcc src/libc/strcmp.c $(CFLAGS_LIBC) -c -o src/libc/strcmp.o

src/libc/strncmp.o: src/libc/strncmp.c
	riscv64-unknown-elf-gcc src/libc/strncmp.c $(CFLAGS_LIBC) -c -o src/libc/strncmp.o

src/libc/memcpy.o: src/libc/memcpy.c
	riscv64-unknown-elf-gcc src/libc/memcpy.c $(CFLAGS_LIBC) -fno-lto -c -o src/libc/memcpy.o

src/libc/picojpeg.o: src/libc/picojpeg.c
	riscv64-unknown-elf-gcc src/libc/picojpeg.c $(CFLAGS_LIBC) -c -o src/libc/picojpeg.o

src/libc/log_buffer_hex.o: src/libc/log_buffer_hex.c
	riscv64-unknown-elf-gcc src/libc/log_buffer_hex.c $(CFLAGS_LIBC) -c -o src/libc/log_buffer_hex.o

src/libc/blake2s-ref.o: src/libc/blake2s-ref.c
	riscv64-unknown-elf-gcc src/libc/blake2s-ref.c $(CFLAGS_LIBC) -c -o src/libc/blake2s-ref.o

src/libc/blake2b-ref.o: src/libc/blake2b-ref.c
	riscv64-unknown-elf-gcc src/libc/blake2b-ref.c $(CFLAGS_LIBC) -c -o src/libc/blake2b-ref.o

src/libc/aes_128.o: src/libc/aes_128.c
	riscv64-unknown-elf-gcc src/libc/aes_128.c $(CFLAGS_LIBC) -c -o src/libc/aes_128.o

src/libc/crc16_ccit.o: src/libc/crc16_ccit.c
	riscv64-unknown-elf-gcc src/libc/crc16_ccit.c $(CFLAGS_LIBC) -c -o src/libc/crc16_ccit.o

src/libc/heap.o: src/libc/heap.c
	riscv64-unknown-elf-gcc src/libc/heap.c $(CFLAGS_LIBC) -c -o src/libc/heap.o

src/libc/bsearch.o: src/libc/bsearch.c
	riscv64-unknown-elf-gcc src/libc/bsearch.c $(CFLAGS_LIBC) -c -o src/libc/bsearch.o

src/libc/rand.o: src/libc/rand.c
	riscv64-unknown-elf-gcc src/libc/rand.c $(CFLAGS_LIBC) -c -o src/libc/rand.o


lib/libm.a: src/libm/arith64.o \
    src/libm/floor.o \
    src/libm/floorf.o \
    src/libm/ceil.o \
    src/libm/ceilf.o \
    src/libm/cos.o \
    src/libm/cosf.o \
    src/libm/sin.o \
    src/libm/sinf.o \
    src/libm/__cos.o \
    src/libm/__sin.o \
    src/libm/__rem_pio2.o \
    src/libm/__rem_pio2f.o \
    src/libm/__rem_pio2_large.o \
    src/libm/scalbn.o \
    src/libm/__cosdf.o \
    src/libm/__sindf.o
	riscv64-unknown-elf-ar cr lib/libm.a \
    src/libm/arith64.o \
    src/libm/floor.o \
    src/libm/floorf.o \
    src/libm/ceil.o \
    src/libm/ceilf.o \
    src/libm/cos.o \
    src/libm/cosf.o \
    src/libm/sin.o \
    src/libm/sinf.o \
    src/libm/__cos.o \
    src/libm/__sin.o \
    src/libm/__rem_pio2.o \
    src/libm/__rem_pio2f.o \
    src/libm/__rem_pio2_large.o \
    src/libm/scalbn.o \
    src/libm/__cosdf.o \
    src/libm/__sindf.o
	riscv64-unknown-elf-ranlib lib/libm.a

src/libm/arith64.o: src/libm/arith64.c
	riscv64-unknown-elf-gcc src/libm/arith64.c $(CFLAGS_LIBC) -c -o src/libm/arith64.o

src/libm/floor.o: src/libm/floor.c
	riscv64-unknown-elf-gcc src/libm/floor.c $(CFLAGS_LIBC) -c -o src/libm/floor.o

src/libm/floorf.o: src/libm/floorf.c
	riscv64-unknown-elf-gcc src/libm/floorf.c $(CFLAGS_LIBC) -c -o src/libm/floorf.o

src/libm/ceil.o: src/libm/ceil.c
	riscv64-unknown-elf-gcc src/libm/ceil.c $(CFLAGS_LIBC) -c -o src/libm/ceil.o

src/libm/ceilf.o: src/libm/ceilf.c
	riscv64-unknown-elf-gcc src/libm/ceilf.c $(CFLAGS_LIBC) -c -o src/libm/ceilf.o

src/libm/cos.o: src/libm/cos.c
	riscv64-unknown-elf-gcc src/libm/cos.c $(CFLAGS_LIBC) -c -o src/libm/cos.o

src/libm/cosf.o: src/libm/cosf.c
	riscv64-unknown-elf-gcc src/libm/cosf.c $(CFLAGS_LIBC) -c -o src/libm/cosf.o

src/libm/sin.o: src/libm/sin.c
	riscv64-unknown-elf-gcc src/libm/sin.c $(CFLAGS_LIBC) -c -o src/libm/sin.o

src/libm/sinf.o: src/libm/sinf.c
	riscv64-unknown-elf-gcc src/libm/sinf.c $(CFLAGS_LIBC) -c -o src/libm/sinf.o

src/libm/__cos.o: src/libm/__cos.c
	riscv64-unknown-elf-gcc src/libm/__cos.c $(CFLAGS_LIBC) -c -o src/libm/__cos.o

src/libm/__sin.o: src/libm/__sin.c
	riscv64-unknown-elf-gcc src/libm/__sin.c $(CFLAGS_LIBC) -c -o src/libm/__sin.o

src/libm/__rem_pio2.o: src/libm/__rem_pio2.c
	riscv64-unknown-elf-gcc src/libm/__rem_pio2.c $(CFLAGS_LIBC) -c -o src/libm/__rem_pio2.o

src/libm/__rem_pio2_large.o: src/libm/__rem_pio2_large.c
	riscv64-unknown-elf-gcc src/libm/__rem_pio2_large.c $(CFLAGS_LIBC) -c -o src/libm/__rem_pio2_large.o

src/libm/scalbn.o: src/libm/scalbn.c
	riscv64-unknown-elf-gcc src/libm/scalbn.c $(CFLAGS_LIBC) -c -o src/libm/scalbn.o

src/libm/__cosdf.o: src/libm/__cosdf.c
	riscv64-unknown-elf-gcc src/libm/__cosdf.c $(CFLAGS_LIBC) -c -o src/libm/__cosdf.o

src/libm/__sindf.o: src/libm/__sindf.c
	riscv64-unknown-elf-gcc src/libm/__sindf.c $(CFLAGS_LIBC) -c -o src/libm/__sindf.o

src/libm/__rem_pio2f.o: src/libm/__rem_pio2f.c
	riscv64-unknown-elf-gcc src/libm/__rem_pio2f.c $(CFLAGS_LIBC) -c -o src/libm/__rem_pio2f.o



clean:
	rm -f lib/libc.a  \
	lib/libm.a \
	src/libm/arith64.o \
	src/libm/floor.o \
	src/libm/floorf.o \
	src/libm/ceil.o \
	src/libm/ceilf.o \
	src/libm/cos.o \
	src/libm/cosf.o \
  src/libm/sin.o \
  src/libm/sinf.o \
	src/libm/__cos.o \
	src/libm/__sin.o \
	src/libm/__rem_pio2.o \
	src/libm/__rem_pio2f.o \
	src/libm/__rem_pio2_large.o \
	src/libm/scalbn.o \
	src/libm/__cosdf.o \
	src/libm/__sindf.o \
	src/libc/crt0.o \
	src/libc/gmtime_r.o \
	src/libc/vectors.o \
	src/libc/runtime.o \
	src/libc/memset.o \
	src/libc/bzero.o \
	src/libc/snprintf.o \
	src/libc/strstr.o \
	src/libc/memmem.o \
	src/libc/memcmp.o \
	src/libc/memchr.o \
	src/libc/strchr.o \
	src/libc/strchrnul.o \
	src/libc/strnlen.o \
	src/libc/strlen.o \
	src/libc/__secs_to_tm.o \
	src/libc/__year_to_secs.o \
	src/libc/__month_to_secs.o \
	src/libc/__tm_to_secs.o \
	src/libc/timegm.o \
	src/libc/strcspn.o \
	src/libc/strsep.o \
	src/libc/strcmp.o \
	src/libc/strncmp.o \
	src/libc/memcpy.o \
	src/libc/picojpeg.o \
	src/libc/log_buffer_hex.o \
	src/libc/blake2s-ref.o \
	src/libc/blake2b-ref.o \
	src/libc/aes_128.o \
	src/libc/crc16_ccit.o \
	src/libc/heap.o \
	src/libc/bsearch.o \
	src/libc/rand.o
