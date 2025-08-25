using backend.Models;
using System.Collections.Generic;

namespace backend.Repositories
{
    public interface IUserRepository
    {
        void Add(User user);
        IEnumerable<User> GetAll();
        User? GetById(int id);
        void Update(User user);
        void Delete(int id);
    }
}