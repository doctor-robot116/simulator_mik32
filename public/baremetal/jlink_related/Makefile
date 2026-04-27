.PHONY: clean


all: mik32_spiflash_W25Q64JV.elf mik32_spiflash_PY25Q128HA.elf mik32_spiflash_EEPROM.elf


mik32_spiflash_W25Q64JV.elf: mik32_spiflash_W25Q64JV.c
	riscv64-unknown-elf-gcc -DMIK32V2 \
			mik32_spiflash_W25Q64JV.c \
	    -I../ \
	    -Ofast -g \
	    -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -fstrict-volatile-bitfields -fno-strict-aliasing -fno-common -nostartfiles -ffreestanding -nostdlib -nodefaultlibs \
			-Wall -Wextra \
			-Wl,-T,./linkerscript.ld,--gc-sections \
			-o mik32_spiflash_W25Q64JV.elf


mik32_spiflash_PY25Q128HA.elf: mik32_spiflash_PY25Q128HA.c
	riscv64-unknown-elf-gcc -DMIK32V2 \
			mik32_spiflash_PY25Q128HA.c \
	    -I../ \
	    -Ofast -g \
	    -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -fstrict-volatile-bitfields -fno-strict-aliasing -fno-common -nostartfiles -ffreestanding -nostdlib -nodefaultlibs \
			-Wall -Wextra \
			-Wl,-T,./linkerscript.ld,--gc-sections \
			-o mik32_spiflash_PY25Q128HA.elf
	riscv64-unknown-elf-strip --discard-all mik32_spiflash_PY25Q128HA.elf

mik32_spiflash_EEPROM.elf: mik32_spiflash_EEPROM.c
	riscv64-unknown-elf-gcc -DMIK32V2 \
			mik32_spiflash_EEPROM.c \
	    -I../ \
	    -Ofast -g \
	    -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -fstrict-volatile-bitfields -fno-strict-aliasing -fno-common -nostartfiles -ffreestanding -nostdlib -nodefaultlibs \
			-Wall -Wextra \
			-Wl,-T,./linkerscript.ld,--gc-sections \
			-o mik32_spiflash_EEPROM.elf
	riscv64-unknown-elf-strip --discard-all mik32_spiflash_EEPROM.elf


clean:
	rm -f *.o \
	      *.elf
