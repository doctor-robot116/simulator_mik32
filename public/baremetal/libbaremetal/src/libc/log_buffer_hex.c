// log_buffer_hex
#include <log_buffer_hex.h>

#include <stdio.h>


#ifdef __cplusplus
extern "C" {
#endif

void log_buffer_hex( const uint8_t *src, int len ) {
  int i, c, k;
  char ln[96];
  char *ucPtr;

  while (len) {
    // start line pointer
    ucPtr = ln;
    // first send address
    for (i = 28; i >= 0; i -= 4) {
      c = (((unsigned int)src) >> i) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    // send 16 or less hex bytes
    for (i = 0; i < 16 && len > 0; i++, len--) {
      //
      *ucPtr++ = ' ';
      //
      c = (*src >> 4) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
      c = (*src++) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    for (k = i; k < 16; ++k) {
      //
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
    }
    //
    *ucPtr++ = ' ';
    // send bytes as symbols
    for (; i > 0; i--) {
      //
      c = *(src - i);
      //
      *ucPtr++ = (c >= 0x20 && c <= 0x7F) ? c : '.';
    }
    // make eol
    // *ucPtr++ = 0x0D;
    // *ucPtr++ = 0x0A;
    *ucPtr = 0x00;
    // send to remote
    printf( "%s\n", ln );
  }
}

#ifdef __cplusplus
}
#endif
