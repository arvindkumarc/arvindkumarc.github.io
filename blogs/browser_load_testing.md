[Back](/blogs/index.html)

## How did we load test 10K browser sessions?
Jul 22, 2023
{: style="text-align: right" }

### Problem
Before we jump directly into the solution, we need to know if it's the only way to performance test the web application. There are well known tools like Gatling, JMeter, Apache Bench, K6 which can all help in doing good deal of HTTP requests and collect the required stats.
{: style="text-align: justify" }
If there is a possibility to understand of the webpage is all HTTP loaded and there are no other components in the UI that you are really worried to be tested at scale, then use the above mentioned tools. Proceed further if your application really needs UI validation to be done at scale.
{: style="text-align: justify" }
