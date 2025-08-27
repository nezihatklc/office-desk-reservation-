namespace backend.Models
{
    public class DeskFacility
    {
        public int DeskId { get; set; }
        public virtual Desk Desk { get; set; } = null!;

        public int FacilityId { get; set; }
        public virtual Facility Facility { get; set; } = null!;
    }
}