SEARCH_DIR(.);

/*
Format configurations
*/
OUTPUT_FORMAT("elf32-littleriscv", "elf32-littlriscv", "elf32-littleriscv");
OUTPUT_ARCH(riscv);

/* 
The stack size used by the application. NOTE: you need to adjust according to your application. 
*/
STACK_SIZE = 0x100;

/*
Memories definitions
*/
MEMORY {
  RAM  (RWX): ORIGIN = 0x02000000, LENGTH = 16K
}
CL_SIZE = 16;

SECTIONS {
    PrgCode ORIGIN(RAM) : {
        KEEP(*(PrgCode PrgCode.*));
        *(.text)
        *(.text.*)
        *(.rodata)
        *(.rodata.*)
    } >RAM
    PrgData : {
        PROVIDE(__data_start = .);
        PROVIDE(__data_end = .);
        . = ALIGN(CL_SIZE);
        *(.srodata.cst16) *(.srodata.cst8) *(.srodata.cst4) *(.srodata.cst2) *(.srodata*)
        *(.sdata .sdata.* .gnu.linkonce.s.*)
        *(.data .data.*)
        *(.sbss .sbss.* .gnu.linkonce.sb.*)
        *(.scommon)
        *(.bss .bss.*)
        *(COMMON)
        . = ALIGN(CL_SIZE);
        PROVIDE(__bss_end = .);
        . = ALIGN(CL_SIZE);
        PROVIDE(__DATA_END__ = .);
    } >RAM

    __data_source = 0;
    /* thread-local data segment */
    /* bss segment */
    
    DevDscr : {
        . = ALIGN(4);
        KEEP(*(DevDscr DevDscr.*));
        . = ALIGN(4);
    } >RAM
    _end = .;

    /DISCARD/ : {
        *(.eh_frame .eh_frame.*)
        *(.comment)
    }
}
