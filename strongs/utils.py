# -*- coding: utf-8 -*-
import datetime

def bible_translation_order(request, column, translation):
    # set the default order
    order = [0, 1, 2, 3, 4]

    # get the cookie, maybe there is a stored order
    cookie_data = request.COOKIES.get('bible_translation_order')
    if cookie_data is not None:
        cookie_datas = cookie_data.split("_")
        if len(cookie_datas) == 5:
            order[0] = int(cookie_datas[0])
            order[1] = int(cookie_datas[1])
            order[2] = int(cookie_datas[2])
            order[3] = int(cookie_datas[3])
            order[4] = int(cookie_datas[4])

    # set the new order
    if column is not None and translation is not None:
        order[int(column)] = int(translation)

    return order

def set_cookies(response, bible_order):
    bible_order_cookie = str(bible_order[0]) + "_" + str(bible_order[1]) + "_" + str(bible_order[2]) + "_" + str(bible_order[3]) + "_" + str(bible_order[4])

    max_age = 30 * 24 * 60 * 60
    expires = datetime.datetime.strftime(datetime.datetime.utcnow() + datetime.timedelta(seconds=max_age), "%a, %d-%b-%Y %H:%M:%S GMT")
    response.set_cookie('bible_translation_order', bible_order_cookie, max_age=max_age, expires=expires)