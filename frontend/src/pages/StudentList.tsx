import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Table, Spin, Alert } from 'antd';
import { Link } from 'react-router-dom';

interface Student {
  id: string;
  enrollmentNumber: string;   // ZPRN
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  department: { code: string; name: string };
  program: { code: string; name: string };
  batch: { name: string; academicYear: string };
}

const fullName = (s: Student) => `${s.firstName} ${s.lastName}`;

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Student[]>('/students')
      .then((res) => {
        setStudents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.message ||
            'Failed to load students – check that you are logged in and have the required role.'
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" tip="Loading students…" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Unable to fetch students"
        description={error}
        showIcon
        className="my-6"
      />
    );
  }

  const columns = [
    {
      title: 'ZPRN',
      dataIndex: 'enrollmentNumber',
      key: 'enrollmentNumber',
      sorter: (a: Student, b: Student) => a.enrollmentNumber.localeCompare(b.enrollmentNumber),
    },
    {
      title: 'Roll No.',
      dataIndex: 'rollNumber',
      key: 'rollNumber',
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, rec: Student) => fullName(rec),
      sorter: (a: Student, b: Student) => fullName(a).localeCompare(fullName(b)),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Dept.',
      key: 'dept',
      render: (_: any, rec: Student) => `${rec.department.code} – ${rec.department.name}`,
    },
    {
      title: 'Program',
      key: 'prog',
      render: (_: any, rec: Student) => `${rec.program.code} – ${rec.program.name}`,
    },
    {
      title: 'Batch',
      key: 'batch',
      render: (_: any, rec: Student) => `${rec.batch.name} (${rec.batch.academicYear})`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, rec: Student) => (
        <Link to={`/students/${rec.id}`} className="text-zes-600 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">All Students</h2>
      <Table
        dataSource={students}
        columns={columns as any}
        rowKey={(rec) => rec.id}
        pagination={{ pageSize: 20 }}
        bordered
      />
    </div>
  );
};

