function GetData($scope, $http)
{
	$http({method: 'GET', url: 'http://angulardemo-21580.onmodulus.net/test'}).
	success(function(data)
	{
		console.log('succeeded');
		$scope.companies = data;
	}).
	error(function(data)
	{
		console.log('failed');
		$scope.companies = 'error';
	});
}