#ifndef  scmRTOS_TARGET_CFG_H
#define  scmRTOS_TARGET_CFG_H

//------------------------------------------------------------------------------
// Define SysTick clock frequency and its interrupt rate in Hz.
#define SYSTICKFREQ     32000u
#define SYSTICKINTRATE  1000u // 1000 Гц - частота прерываний от системного таймера

//------------------------------------------------------------------------------
// Define number of priority bits implemented in hardware.
//
#define CORE_PRIORITY_BITS  4


#endif // scmRTOS_TARGET_CFG_H

