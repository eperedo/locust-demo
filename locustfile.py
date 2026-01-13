import random
import time
from locust import HttpUser, task, between
from locust.clients import HttpSession

SALES_URL = "http://host.docker.internal:8081"
ACL_URL = "http://host.docker.internal:8082"


class WebsiteUser(HttpUser):
    host = ACL_URL
    wait_time = between(0.5, 1.0)

    def on_start(self) -> None:
        
        self.acl = HttpSession(
            base_url=ACL_URL,
            request_event=self.environment.events.request,
            user=self,
        )
        self.sales = HttpSession(
            base_url=SALES_URL,
            request_event=self.environment.events.request,
            user=self,
        )

        self.token: str = ""
        self._register_user()
        self._create_customers()

    def on_stop(self) -> None:
        
        self._logout()

    def _register_user(self) -> None:
        payload = {
            "email": f"loadtest_{random.randint(1, 10_000_000)}@example.com",
        }

        with self.acl.post("/auth/register", json=payload, name="acl: POST /auth/register", catch_response=True) as r:
            if r.status_code != 200:
                r.failure(f"register failed: {r.status_code} {r.text}")
                return

            body = r.json()
            token = body.get("token")
            if not token:
                r.failure("register response missing token")
                return

            self.token = token
            r.success()

    def _create_customers(self) -> None:
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        for _ in range(5):
            current_time = int(time.time() * 1000)
            payload = {
                "name": f"customer{current_time}{self.token}",
            }

            with self.sales.post(
                "/customer",
                json=payload,
                headers=headers,
                name="sales: POST /customer",
                catch_response=True,
            ) as r:
                if r.status_code not in (200, 201):
                    r.failure(f"create customer failed: {r.status_code} {r.text}")
                else:
                    r.success()

    def _logout(self) -> None:
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        with self.acl.post(
            "/auth/logout",
            headers=headers,
            name="acl: POST /auth/logout",
            catch_response=True,
        ) as r:
            if r.status_code != 200:
                r.failure(f"logout failed: {r.status_code} {r.text}")
            else:
                r.success()

    @task
    def create_sales(self) -> None:
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        # Obtener lista de customers
        with self.sales.get(
            "/customers",
            headers=headers,
            name="sales: GET /customers",
            catch_response=True,
        ) as r:
            if r.status_code != 200:
                r.failure(f"get customers failed: {r.status_code} {r.text}")
                return

            customers = r.json()
            if not customers:
                r.failure("no customers available")
                return
            r.success()

        random_customer = random.choice(customers)
        payload = {
            "customer_id": random_customer.get("id"),
        }

        # for _ in range(100):
        with self.sales.post(
            "/sales",
            json=payload,
            headers=headers,
            name="sales: POST /sales",
            catch_response=True,
        ) as r:
            if r.status_code not in (200, 201):
                r.failure(f"create sale failed: {r.status_code} {r.text}")
            else:
                r.success()
        
