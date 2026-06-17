
 
const Tea = ({ description = 'Tea' }) => {
 
    return (
    <div className="border p-4 rounded shadow mb-2">
      <p>Tea!</p>
      {description && <p>Made of: {description}</p>}
    </div>
  );
};

export default Tea;
