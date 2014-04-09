from django.test import TestCase
from django.test import Client

# Create your tests here.
class NoteTest(TestCase):
    def test_get_note(self):
        c = Client()
        response = c.get('/edit/40/6/1/')
        self.assertEqual(response.status_code, 200)

    def test_save_note(self):
        c = Client()
        response = c.post('/save/40/6/1/', {'note':'das ist mein Kommentar'})
        self.assertEqual(response.status_code, 200)