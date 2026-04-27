.globl _start, main
.globl __libc_init_array, __libc_init_mcu
.weak __libc_init_array, __libc_init_mcu


.altmacro
.macro memcpy src_beg, src_end, dst, tmp_reg
    LOCAL memcpy_1, memcpy_2
    j    memcpy_2
memcpy_1:
    lw   \tmp_reg, (\src_beg)
    sw   \tmp_reg, (\dst)
    add  \src_beg, \src_beg, 4
    add  \dst, \dst, 4
memcpy_2:
    bltu \src_beg, \src_end, memcpy_1
.endm

.macro memset dst_beg, dst_end, val_reg
    LOCAL memset_1, memset_2
    j    memset_2
memset_1:
    sw   \val_reg, (\dst_beg)
    add  \dst_beg, \dst_beg, 4
memset_2:
    bltu \dst_beg, \dst_end, memset_1
.endm


# la uses PC relative addressing (auipc instruction)
# Explicit absolut addressing with lui instruction is used 
# to allow startup code to be executed from any PC address
# (la instruction equivalents are left in comments)
    
.macro la_abs reg, address
    .option push
    .option norelax
    lui \reg, %hi(\address)
    addi \reg, \reg, %lo(\address)
    .option pop
.endm


.macro jalr_abs return_reg, address
    .option push
    .option norelax
    lui \return_reg, %hi(\address)
    jalr \return_reg, %lo(\address)(\return_reg)
    .option pop
.endm



.global reset_handler
.type reset_handler,@function
_start:
reset_handler:
    li t0, 128000
start_loop_delay:
    nop
    addi t0, t0, -1
    bnez t0, start_loop_delay    
    
    # Init stack and global pointer
    #
    la_abs  sp, __C_STACK_TOP__
    la_abs  gp, __global_pointer$
    
    # Init data
    #
    la_abs  a1, __DATA_IMAGE_START__
    la_abs  a2, __DATA_IMAGE_END__
    la_abs  a3, __DATA_START__
    memcpy  a1, a2, a3, t0
    
    # Clear bss
    #
    la_abs  a1, __BSS_START__
    la_abs  a2, __BSS_END__
    memset a1, a2, zero

    #ifdef MIK32V0
    # Enable pad_config clocking
    #
    li t0, (1 << 3)
    li t1, 0x50014
    sw t0, (t1)
    #endif
    
    li t0, 0x2000000 # в итоге будет 0x20000C0
    csrw mtvec, t0

    jalr_abs ra, __libc_init_mcu
    jalr_abs ra, __libc_init_array
    jalr_abs ra, main
infinite_loop:
    wfi
    j infinite_loop

__libc_init_mcu:
__libc_init_array:
    ret
