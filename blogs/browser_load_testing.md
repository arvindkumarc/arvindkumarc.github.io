---
layout: default
title: How did we load test 10K browser sessions?
---

[← Back to Blog](/blogs/)

# How did we load test 10K browser sessions?

*July 22, 2023*

---

## Problem

Before we jump directly into the solution, we need to know if it's the only way to performance test the web application. There are well known tools like Gatling, JMeter, Apache Bench, K6 which can all help in doing good deal of HTTP requests and collect the required stats.

If there is a possibility to understand if the webpage is all HTTP loaded and there are no other components in the UI that you are really worried to be tested at scale, then use the above mentioned tools. Proceed further if your application really needs UI validation to be done at scale.
