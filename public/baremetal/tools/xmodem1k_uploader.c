#include "../libbaremetal/include/crc16_ccit.h"

#include <fcntl.h>
#include <errno.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>
#include <inttypes.h>
#include <time.h>
#include <termios.h>
#include <stdio.h>
#include <sys/stat.h>
#include <sys/time.h>


int main( int argc, char ** argv ) {
  //
  int v_port = open( argv[1], O_RDWR | O_NOCTTY );
  //
  struct termios v_ts;
  //
  tcgetattr( v_port, &v_ts );
  //
  speed_t v_baud = B460800;
  cfsetospeed( &v_ts, v_baud );
  cfsetispeed( &v_ts, v_baud );
  //
  cfmakeraw( &v_ts );
  v_ts.c_cc[VMIN] = 1;
  v_ts.c_cc[VTIME] = 0;

  v_ts.c_cflag &= ~CSTOPB;
  v_ts.c_cflag &= ~CRTSCTS;
  v_ts.c_cflag |= (CLOCAL | CREAD);
  tcsetattr( v_port, TCSANOW, &v_ts );
  //
  tcflush( v_port, TCIOFLUSH );
  //
  alarm( 4 );
  uint8_t v_c;
  for ( ssize_t v_rc = read( v_port, &v_c, 1); v_rc >= 0; v_rc = read( v_port, &v_c, 1 ) ) {
    if ( 'C' == v_c ) {
      break;
    } else {
      printf( "%c", v_c );
    }
  }
  alarm( 0 );
  //
  struct stat v_st;
  bzero( &v_st, sizeof(v_st) );
  if ( 0 != stat( argv[2], &v_st ) ) {
    close( v_port );
    return 1;
  }
  //
  uint8_t v_buf[1029];
  int v_block_num = 1;
  int v_blocks_count = (v_st.st_size + 1023) / 1024;
  //
  struct timeval v_from;
  gettimeofday( &v_from, NULL );
  //
  int v_file = open( argv[2], O_RDONLY );
  while ( v_st.st_size > 0 ) {
    memset( &v_buf[3], 0xFF, 1024 );
    if ( v_st.st_size >= 1024 ) {
      read( v_file, &v_buf[3], 1024 );
      v_st.st_size -= 1024;
    } else {
      read( v_file, &v_buf[3], v_st.st_size );
      v_st.st_size = 0;
    }
    //  
    v_buf[0] = 2;
    v_buf[1] = v_block_num;
    v_buf[2] = ~v_block_num;
    uint16_t v_crc = crc16_xmodem( &v_buf[3], 1024 );
    v_buf[1027] = (uint8_t)(v_crc >> 8);
    v_buf[1028] = (uint8_t)v_crc;
    ssize_t v_written = write( v_port, v_buf, sizeof(v_buf) );
    printf( "written block %d from %d\n", v_block_num, v_blocks_count );
    ++v_block_num;
    //
    uint8_t v_c = 0;
    time_t v_from = time( NULL );
    int v_to_go = 0;
    alarm( 2 );
    for ( ssize_t v_rc = read( v_port, &v_c, 1 ); v_rc >= 0; v_rc = read( v_port, &v_c, 1 ) ) {
      if ( 0x06 == v_c ) {
        break;
      } else {
        printf( "%c", v_c );
      }
    }
    alarm( 0 );
  }
  //
  if ( 0 == v_st.st_size ) {
    uint8_t v_c = 0x04;
    write( v_port, &v_c, 1 );
  }
  //
  alarm( 2 );
  for ( ssize_t v_rc = read( v_port, &v_c, 1); v_rc >= 0; v_rc = read( v_port, &v_c, 1 ) ) {
    if ( 0x06 == v_c ) {
      break;
    } else {
      printf( "%c", v_c );
    }
  }
  alarm( 0 );
  close( v_port );
  //
  struct timeval v_to;
  gettimeofday( &v_to, NULL );
  if ( v_to.tv_usec < v_from.tv_usec ) {
    v_to.tv_usec += 1000000;
    --v_to.tv_sec;
  }
  v_to.tv_usec -= v_from.tv_usec;
  v_to.tv_sec -= v_from.tv_sec;
  printf( "elapsed time: %ld.%06ld s.\n", v_to.tv_sec, v_to.tv_usec );
  return 0;
}
