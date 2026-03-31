import { useEffect, useState } from "react";
import axios from "axios";

const Body = ({ getAccessToken }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [puppies, setPuppies] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
  });
  const [editingId, setEditingId] = useState(null);

const getAuthConfig = async () => {
  const token = await getAccessToken();

  console.log("TOKEN:", token);

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

  const fetchPuppies = async () => {
    try {
      const config = await getAuthConfig();
      const res = await axios.get(apiUrl, config);
      setPuppies(res.data);
    } catch (err) {
      console.error("Error fetching puppies:", err);
    }
  };

  useEffect(() => {
    fetchPuppies();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const config = await getAuthConfig();

      if (editingId) {
        await axios.put(`${apiUrl}/${editingId}`, formData, config);
        setEditingId(null);
      } else {
        await axios.post(apiUrl, formData, config);
      }

      setFormData({
        name: "",
        breed: "",
        age: "",
      });

      fetchPuppies();
    } catch (err) {
      console.error("Error saving puppy:", err);
    }
  };

  const handleEdit = (puppy) => {
    setFormData({
      name: puppy.name,
      breed: puppy.breed,
      age: puppy.age,
    });
    setEditingId(puppy.id);
  };

  const handleDelete = async (id) => {
    try {
      const config = await getAuthConfig();
      await axios.delete(`${apiUrl}/${id}`, config);
      fetchPuppies();
    } catch (err) {
      console.error("Error deleting puppy:", err);
    }
  };

  return (
    <main className="body-container">
      <section className="form-section">
        <h2>{editingId ? "Edit Puppy" : "Add Puppy"}</h2>

        <form onSubmit={handleSubmit} className="puppy-form">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="breed"
            placeholder="Breed"
            value={formData.breed}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="age"
            placeholder="Age"
            value={formData.age}
            onChange={handleChange}
            required
          />
          <button type="submit">
            {editingId ? "Update Puppy" : "Add Puppy"}
          </button>
        </form>
      </section>

      <section className="table-section">
        <h2>Puppies</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Breed</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {puppies.map((puppy) => (
              <tr key={puppy.id}>
                <td>{puppy.id}</td>
                <td>{puppy.name}</td>
                <td>{puppy.breed}</td>
                <td>{puppy.age}</td>
                <td>
                  <button onClick={() => handleEdit(puppy)}>Edit</button>
                  <button onClick={() => handleDelete(puppy.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default Body;