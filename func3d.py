import math

R_EARTH_KM = 6371.0
MU_EARTH = 398600.4418
OMEGA_EARTH = 7.2921159e-5


def _deg2rad(d):
    return d * math.pi / 180.0


def _rad2deg(r):
    return r * 180.0 / math.pi


def _mean_motion(alt_km):
    return math.sqrt(MU_EARTH / (R_EARTH_KM + alt_km) ** 3)


def _sat_eci(alt_km, inc, raan, ta):
    r = R_EARTH_KM + alt_km
    xo, yo = r * math.cos(ta), r * math.sin(ta)
    ci, si = math.cos(inc), math.sin(inc)
    cr, sr = math.cos(raan), math.sin(raan)
    return (cr * xo - sr * ci * yo, sr * xo + cr * ci * yo, si * yo)


def _eci_to_ecef(x, y, z, t, ea0):
    th = ea0 + OMEGA_EARTH * t
    c, s = math.cos(th), math.sin(th)
    return c * x + s * y, -s * x + c * y, z


def _ecef_to_lla(x, y, z):
    r = math.sqrt(x * x + y * y + z * z)
    return (_rad2deg(math.asin(z / r)), _rad2deg(math.atan2(y, x)), r - R_EARTH_KM)
