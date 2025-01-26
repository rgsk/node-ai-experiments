from math import gcd


def C(n, r):
    if r == 0:
        return 1
    if r > n // 2:
        return C(n, n - r)
    return n * C(n - 1, r - 1) // r


def reduce_fraction(numerator, denominator):
    """
    Reduces a fraction to its shortest form.
    :param numerator: int, the numerator of the fraction
    :param denominator: int, the denominator of the fraction
    :return: tuple, the reduced numerator and denominator
    """
    common_divisor = gcd(numerator, denominator)
    return numerator // common_divisor, denominator // common_divisor
