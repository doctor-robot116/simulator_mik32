#ifndef __MATH_H__
#define __MATH_H__


#define M_PI_2          1.57079632679489661923  /* pi/2 */


#define FP_NAN       0
#define FP_INFINITE  1

#ifdef __cplusplus
extern "C" {
#endif

static __inline unsigned __FLOAT_BITS(float __f)
{
	union {float __f; unsigned __i;} __u;
	__u.__f = __f;
	return __u.__i;
}

static __inline unsigned long long __DOUBLE_BITS(double __f)
{
	union {double __f; unsigned long long __i;} __u;
	__u.__f = __f;
	return __u.__i;
}

#define isinf(x) ( \
	sizeof(x) == sizeof(float) ? (__FLOAT_BITS(x) & 0x7fffffff) == 0x7f800000 : \
  (__DOUBLE_BITS(x) & -1ULL>>1) == 0x7ffULL<<52 )

#define isnan(x) ( \
	sizeof(x) == sizeof(float) ? (__FLOAT_BITS(x) & 0x7fffffff) > 0x7f800000 : \
  (__DOUBLE_BITS(x) & -1ULL>>1) > 0x7ffULL<<52 )


float floorf( float );
double floor( double );
float ceilf( float );
double ceil( double );
double scalbn(double, int);
double cos(double);
float cosf(float);
double sin(double);
float sinf(float);

#ifdef __cplusplus
}
#endif


#endif // __MATH_H__
